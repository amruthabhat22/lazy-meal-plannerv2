import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Drumstick,
  Egg,
  Leaf,
  Lightbulb,
  Moon,
  Phone,
  Soup,
  Sparkles,
  Trash2,
  TreePalm,
  Utensils,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from "lucide-react-native";
import type { Diet } from "@/engine/types";
import { CatalogTooSmallError } from "@/engine/types";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import { CUISINES } from "@/utils/cuisines";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { SelectableCard } from "@/components/SelectableCard";
import { AllergenChips } from "@/components/AllergenChips";
import {
  GoalSliderCard,
  calorieLevelLabel,
  proteinLevelLabel,
} from "@/components/GoalSliderCard";
import {
  addContact,
  formatPhone,
  getContacts,
  normalizePhone,
  removeContact,
  type ShareContact,
} from "@/utils/contacts";
import { FONT_CLIP_FIX } from "@/utils/androidText";

const TOTAL_STEPS = 6;

const STEP_META = [
  { title: "What's your diet?", subtitle: "We'll tailor every meal to suit you." },
  { title: "Your daily goals", subtitle: "Set your protein and calorie targets." },
  {
    title: "Cuisine preferences",
    subtitle:
      "We\u2019ll only plan dishes from cuisines you pick. Skip to allow all.",
  },
  {
    title: "Any allergies?",
    subtitle: "Optional — we'll never suggest a dish containing these.",
  },
  {
    title: "Share Weekly Plan",
    subtitle: "Optional — save numbers to share your plan on WhatsApp each week.",
  },
  { title: "Meals per day", subtitle: "Choose a rhythm that fits your routine." },
];

const DIET_OPTIONS: {
  value: Diet;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { value: "veg", title: "Vegetarian", description: "Paneer, dals, tofu & legumes", icon: Leaf },
  { value: "egg", title: "Eggetarian", description: "Veg meals plus eggs", icon: Egg },
  { value: "non-veg", title: "Non-Vegetarian", description: "Chicken, fish, eggs & more", icon: Drumstick },
];

const MEAL_OPTIONS: {
  value: 2 | 3 | 4;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { value: 2, title: "2 meals", description: "Skip breakfast or dinner", icon: Moon },
  { value: 3, title: "3 meals", description: "Breakfast · Lunch · Dinner", icon: Utensils },
  { value: 4, title: "4 meals", description: "3 meals + a protein snack", icon: Sparkles },
];

const CUISINE_ICONS: Record<string, LucideIcon> = {
  "north-indian": Wheat,
  "south-indian": TreePalm,
  continental: UtensilsCrossed,
  chinese: Soup,
};

const inputStyle =
  "rounded-xl bg-muted px-3.5 py-2.5 text-[15px] text-foreground";

/** "Step N of 5 · NN%" header + segmented progress (current segment wide). */
function StepProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step {current} of {total}
        </Text>
        <Text className="text-xs font-medium text-muted-foreground">
          {Math.round((current / total) * 100)}%
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          return (
            <View
              key={n}
              className={`h-1.5 rounded-full ${
                n === current
                  ? "bg-primary"
                  : n < current
                    ? "bg-primary/70"
                    : "bg-secondary"
              }`}
              style={{ flex: n === current ? 3 : 1 }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function Onboarding() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const savePrefs = usePrefsStore((s) => s.save);
  const regenerate = usePlanStore((s) => s.regenerate);

  const [step, setStep] = useState(1);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [goal, setGoal] = useState(100);
  const [calories, setCalories] = useState(2000);
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
  const [allergies, setAllergies] = useState<Set<string>>(new Set());
  const [meals, setMeals] = useState<2 | 3 | 4 | null>(null);
  const [busy, setBusy] = useState(false);

  // Contacts step state
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    void getContacts(db).then(setContacts);
  }, [db]);

  const canContinue =
    (step === 1 && diet !== null) ||
    (step >= 2 && step <= 5) ||
    (step === 6 && meals !== null && !busy);
  const isLast = step === TOTAL_STEPS;

  const toggleCuisine = (slug: string) => {
    setCuisines((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleAllergy = (slug: string) => {
    setAllergies((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const canAddContact =
    contactName.trim().length > 0 && normalizePhone(contactPhone).length >= 8;

  const handleAddContact = async () => {
    if (!canAddContact) return;
    const added = await addContact(db, contactName, contactPhone);
    if (!added) {
      Alert.alert("Already saved", "That number is already in your list.");
      return;
    }
    setContacts(await getContacts(db));
    setContactName("");
    setContactPhone("");
  };

  const finish = async () => {
    if (!diet || !meals || busy) return;
    setBusy(true);
    try {
      const prefs = await savePrefs(db, {
        diet,
        proteinGoal: goal,
        calorieGoal: calories,
        mealsPerDay: meals,
        cuisines: [...cuisines],
        allergies: [...allergies],
      });
      await regenerate(db, prefs);
      router.replace("/");
    } catch (e) {
      setBusy(false);
      if (e instanceof CatalogTooSmallError) {
        Alert.alert(
          "Not enough meals",
          "We couldn't find enough meals for these settings. Try a different diet or meal count.",
        );
      } else {
        throw e;
      }
    }
  };

  const handleNext = () => {
    if (!canContinue) return;
    if (isLast) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const goalLabel = proteinLevelLabel(goal);
  const calorieLabel = calorieLevelLabel(calories);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header: back · brand · progress */}
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between mb-5">
          <Pressable
            onPress={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            hitSlop={8}
            accessibilityLabel="Back"
            className={`h-10 w-10 rounded-full border border-border bg-card items-center justify-center ${
              step === 1 ? "opacity-0" : ""
            }`}
          >
            <Icon icon={ArrowLeft} size="sm" color={ICON_COLORS.foreground} />
          </Pressable>
          <Text className="text-sm font-semibold tracking-tight text-foreground" style={FONT_CLIP_FIX}>
            EezyMeals
          </Text>
          <View className="h-10 w-10" />
        </View>
        <StepProgress current={step} total={TOTAL_STEPS} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
      >
        <View className="mt-8 mb-7">
          <Text className="text-3xl font-semibold tracking-tight text-foreground" style={FONT_CLIP_FIX}>
            {STEP_META[step - 1].title}
          </Text>
          <Text className="mt-2 text-base text-muted-foreground">
            {STEP_META[step - 1].subtitle}
          </Text>
        </View>

        {step === 1 &&
          DIET_OPTIONS.map((opt) => (
            <SelectableCard
              key={opt.value}
              icon={opt.icon}
              title={opt.title}
              description={opt.description}
              selected={diet === opt.value}
              onPress={() => setDiet(opt.value)}
            />
          ))}

        {step === 2 && (
          <>
            <GoalSliderCard
              label="Protein"
              levelLabel={goalLabel}
              value={goal}
              unitLabel="g / day"
              min={60}
              max={200}
              step={5}
              onChange={setGoal}
            />
            <View className="mt-4">
              <GoalSliderCard
                label="Calories"
                levelLabel={calorieLabel}
                value={calories}
                unitLabel="kcal / day"
                min={1200}
                max={3500}
                step={50}
                onChange={setCalories}
              />
            </View>
            <View className="flex-row items-center gap-2.5 rounded-full bg-accent/60 border border-accent px-4 py-3 mt-4">
              <Icon
                icon={Lightbulb}
                size="sm"
                color={ICON_COLORS.accentForeground}
              />
              <Text className="flex-1 text-sm leading-snug text-accent-foreground">
                <Text className="font-semibold" style={FONT_CLIP_FIX}>Tip:</Text> aim for ~1g protein
                per kg of body weight.
              </Text>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text className="text-sm text-muted-foreground mb-3">
              Pick as many as you like.
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {CUISINES.map((c) => {
                const selected = cuisines.has(c.slug);
                return (
                  <Pressable
                    key={c.slug}
                    onPress={() => toggleCuisine(c.slug)}
                    className={`rounded-2xl border bg-card pl-3.5 pr-3 py-3 flex-row items-center gap-2.5 ${
                      selected ? "border-primary/70" : "border-border"
                    }`}
                    style={{ width: "48%" }}
                  >
                    <View
                      className={`h-9 w-9 rounded-xl items-center justify-center ${
                        selected ? "bg-primary/10" : "bg-accent"
                      }`}
                    >
                      <Icon
                        icon={CUISINE_ICONS[c.slug] ?? Utensils}
                        size="md"
                        color={
                          selected
                            ? ICON_COLORS.primary
                            : ICON_COLORS.accentForeground
                        }
                      />
                    </View>
                    <Text className="flex-1 text-sm font-semibold text-foreground leading-tight" style={FONT_CLIP_FIX}>
                      {c.label}
                    </Text>
                    <View
                      className={`h-5 w-5 rounded-full border items-center justify-center ${
                        selected ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {selected ? (
                        <Icon
                          icon={Check}
                          size={12}
                          color={ICON_COLORS.primaryForeground}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text className="text-sm text-muted-foreground mb-3">
              Pick any that apply — you can change these in Profile anytime.
            </Text>
            <AllergenChips selected={allergies} onToggle={toggleAllergy} />
          </>
        )}

        {step === 5 && (
          <>
            {contacts.map((c) => (
              <View
                key={c.id}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 mb-2"
              >
                <View className="h-9 w-9 rounded-full bg-primary/10 items-center justify-center">
                  <Icon icon={Phone} size="sm" color={ICON_COLORS.primary} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                    {c.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {formatPhone(c.phone)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    void removeContact(db, c.id).then(async () =>
                      setContacts(await getContacts(db)),
                    );
                  }}
                  hitSlop={12}
                  accessibilityLabel={`Remove ${c.name}`}
                >
                  <Icon icon={Trash2} size="sm" color={ICON_COLORS.muted} />
                </Pressable>
              </View>
            ))}

            <View className="rounded-2xl border border-border bg-card p-3 mt-1">
              <Text className="text-xs font-medium text-muted-foreground mb-1.5">
                Name
              </Text>
              <TextInput
                className={inputStyle}
                placeholder="e.g. Amma"
                placeholderTextColor="#6c6158"
                value={contactName}
                onChangeText={setContactName}
              />
              <Text className="text-xs font-medium text-muted-foreground mb-1.5 mt-3">
                WhatsApp number (with country code)
              </Text>
              <TextInput
                className={inputStyle}
                placeholder="+91 98765 43210"
                placeholderTextColor="#6c6158"
                keyboardType="phone-pad"
                value={contactPhone}
                onChangeText={setContactPhone}
              />
              <View className="mt-3">
                <Button
                  label="Save contact"
                  rounded="xl"
                  height={44}
                  onPress={() => void handleAddContact()}
                  disabled={!canAddContact}
                />
              </View>
            </View>
            <Text className="text-xs text-muted-foreground text-center mt-3">
              You can skip this — sharing also works without saved numbers.
            </Text>
          </>
        )}

        {step === 6 && (
          <>
            {MEAL_OPTIONS.map((opt) => (
              <SelectableCard
                key={opt.value}
                icon={opt.icon}
                title={opt.title}
                description={opt.description}
                selected={meals === opt.value}
                onPress={() => setMeals(opt.value)}
              />
            ))}
            {meals ? (
              <View className="rounded-2xl border border-border bg-secondary/50 px-4 py-3.5 mt-3">
                <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1" style={FONT_CLIP_FIX}>
                  Your plan
                </Text>
                <Row
                  label="Diet"
                  value={
                    DIET_OPTIONS.find((d) => d.value === diet)?.title ?? "—"
                  }
                />
                <Row label="Protein" value={`${goal}g / day`} />
                <Row label="Calories" value={`${calories} kcal / day`} />
                <Row label="Meals" value={`${meals} per day`} />
              </View>
            ) : null}
            {busy ? (
              <Text className="text-center text-sm text-muted-foreground mt-4">
                Building your week…
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View
        className="absolute left-0 right-0 bottom-0 border-t border-border bg-background px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          className={`h-14 rounded-full flex-row items-center justify-center gap-2 ${
            canContinue ? "bg-primary" : "bg-secondary"
          }`}
          style={
            canContinue
              ? {
                  shadowColor: "#503c28",
                  shadowOpacity: 0.35,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 5,
                }
              : undefined
          }
        >
          {isLast ? (
            <Icon
              icon={Sparkles}
              size="sm"
              color={
                canContinue
                  ? ICON_COLORS.primaryForeground
                  : ICON_COLORS.muted
              }
            />
          ) : null}
          <Text
            className={`text-base font-semibold ${
              canContinue ? "text-primary-foreground" : "text-muted-foreground"
            }`}
           style={FONT_CLIP_FIX}>
            {isLast ? "Generate My Week" : "Continue"}
          </Text>
          {!isLast ? (
            <Icon
              icon={ArrowRight}
              size="sm"
              color={
                canContinue
                  ? ICON_COLORS.primaryForeground
                  : ICON_COLORS.muted
              }
            />
          ) : null}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2.5 border-b border-border/70">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground tabular-nums" style={FONT_CLIP_FIX}>
        {value}
      </Text>
    </View>
  );
}
