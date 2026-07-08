import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Feather } from "@expo/vector-icons";
import type { Diet } from "@/engine/types";
import { CatalogTooSmallError } from "@/engine/types";
import { usePrefsStore } from "@/state/usePrefsStore";
import { usePlanStore } from "@/state/usePlanStore";
import { CUISINES } from "@/utils/cuisines";
import {
  addContact,
  formatPhone,
  getContacts,
  normalizePhone,
  removeContact,
  type ShareContact,
} from "@/utils/contacts";

const TOTAL_STEPS = 5;

const STEP_META = [
  { title: "What's your diet?", subtitle: "We'll tailor every meal to suit you." },
  { title: "Your protein goal", subtitle: "How much protein do you want each day?" },
  { title: "Cuisine preferences", subtitle: "Optional — pick the flavors you love." },
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
  icon: string;
}[] = [
  { value: "veg", title: "Vegetarian", description: "Paneer, dals, tofu & legumes", icon: "🥬" },
  { value: "egg", title: "Eggetarian", description: "Veg meals plus eggs", icon: "🥚" },
  { value: "non-veg", title: "Non-Vegetarian", description: "Chicken, fish, eggs & more", icon: "🍗" },
];

const MEAL_OPTIONS: {
  value: 2 | 3 | 4;
  title: string;
  description: string;
  icon: string;
}[] = [
  { value: 2, title: "2 meals", description: "Skip breakfast or dinner", icon: "🌗" },
  { value: 3, title: "3 meals", description: "Breakfast · Lunch · Dinner", icon: "🍽️" },
  { value: 4, title: "4 meals", description: "3 meals + a protein snack", icon: "✨" },
];

const CUISINE_ICONS: Record<string, string> = {
  "south-indian": "🥥",
  "north-indian": "🫓",
  american: "🍔",
  chinese: "🥡",
  mediterranean: "🫒",
  asian: "🍜",
  tibetan: "🥟",
  mexican: "🌮",
  italian: "🍝",
};

const DIET_ICON: Record<Diet, string> = {
  veg: "🌿",
  egg: "🥚",
  "non-veg": "🍗",
};

const inputStyle =
  "rounded-xl bg-muted px-3.5 py-2.5 text-[15px] text-foreground";

function SelectableCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border bg-card px-4 py-3.5 mb-3 ${
        selected ? "border-primary/70" : "border-border"
      }`}
      style={
        selected
          ? {
              shadowColor: "#503c28",
              shadowOpacity: 0.18,
              shadowRadius: 15,
              shadowOffset: { width: 0, height: 10 },
              elevation: 3,
            }
          : undefined
      }
    >
      <View className="flex-row items-center gap-3.5">
        <View
          className={`h-12 w-12 rounded-xl items-center justify-center ${
            selected ? "bg-primary/10" : "bg-accent"
          }`}
        >
          <Text className="text-xl">{icon}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-base font-semibold text-foreground leading-tight">
            {title}
          </Text>
          <Text
            className="text-[13px] text-muted-foreground mt-0.5"
            numberOfLines={1}
          >
            {description}
          </Text>
        </View>
        <View
          className={`h-5 w-5 rounded-full border items-center justify-center ${
            selected ? "border-primary bg-primary" : "border-border"
          }`}
        >
          {selected ? <Feather name="check" size={11} color="#fefbf8" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function Onboarding() {
  const db = useSQLiteContext();
  const savePrefs = usePrefsStore((s) => s.save);
  const regenerate = usePlanStore((s) => s.regenerate);

  const [step, setStep] = useState(1);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [goal, setGoal] = useState(100);
  const [cuisines, setCuisines] = useState<Set<string>>(new Set());
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
    step === 2 ||
    step === 3 ||
    step === 4 ||
    (step === 5 && meals !== null && !busy);
  const isLast = step === TOTAL_STEPS;

  const toggleCuisine = (slug: string) => {
    setCuisines((prev) => {
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
        mealsPerDay: meals,
        cuisines: [...cuisines],
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

  const goalLabel =
    goal < 90 ? "Maintenance" : goal < 140 ? "Active lifestyle" : "Muscle building";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header: back · brand · progress */}
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between mb-5">
          <Pressable
            onPress={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className={`h-10 w-10 rounded-full border border-border bg-card items-center justify-center ${
              step === 1 ? "opacity-0" : ""
            }`}
          >
            <Feather name="arrow-left" size={15} color="#291f18" />
          </Pressable>
          <Text className="text-sm font-semibold tracking-tight text-foreground">
            Lazy Meal Planner
          </Text>
          <View className="h-10 w-10" />
        </View>
        <View className="flex-row gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i < step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
      >
        <View className="mt-8 mb-7">
          <Text className="text-3xl font-semibold tracking-tight text-foreground">
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
            <View className="rounded-3xl bg-card border border-border p-6 items-center">
              <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Daily protein goal
              </Text>
              <View className="mt-3 flex-row items-baseline gap-1">
                <Text className="text-6xl font-semibold text-foreground tabular-nums tracking-tight">
                  {goal}
                </Text>
                <Text className="text-2xl font-medium text-muted-foreground">
                  g
                </Text>
              </View>
              <Text className="mt-2 text-sm text-muted-foreground">
                {goalLabel}
              </Text>
              <Slider
                style={{ width: "100%", height: 40, marginTop: 24 }}
                minimumValue={60}
                maximumValue={200}
                step={5}
                value={goal}
                onValueChange={setGoal}
                minimumTrackTintColor="#a55a37"
                maximumTrackTintColor="#e3ddd5"
                thumbTintColor="#a55a37"
              />
              <View className="flex-row justify-between w-full mt-2">
                <Text className="text-xs text-muted-foreground font-medium">
                  60g
                </Text>
                <Text className="text-xs text-muted-foreground font-medium">
                  200g
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5 rounded-full bg-accent/60 border border-accent px-4 py-2.5 mt-4">
              <Text>💡</Text>
              <Text className="flex-1 text-xs leading-snug text-accent-foreground">
                <Text className="font-semibold">Tip:</Text> aim for ~1g protein
                per kg of body weight.
              </Text>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text className="text-[13px] text-muted-foreground mb-3">
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
                      <Text className="text-lg">
                        {CUISINE_ICONS[c.slug] ?? "🍽️"}
                      </Text>
                    </View>
                    <Text className="flex-1 text-[14px] font-semibold text-foreground leading-tight">
                      {c.label}
                    </Text>
                    <View
                      className={`h-5 w-5 rounded-full border items-center justify-center ${
                        selected ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {selected ? (
                        <Feather name="check" size={11} color="#fefbf8" />
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
            {contacts.map((c) => (
              <View
                key={c.id}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 mb-2"
              >
                <View className="h-9 w-9 rounded-full bg-primary/10 items-center justify-center">
                  <Feather name="phone" size={14} color="#a55a37" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-foreground">
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
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={15} color="#6c6158" />
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
              <Pressable
                onPress={() => void handleAddContact()}
                disabled={!canAddContact}
                className={`h-11 rounded-xl items-center justify-center mt-3 ${
                  canAddContact ? "bg-primary" : "bg-secondary"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    canAddContact
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Save contact
                </Text>
              </Pressable>
            </View>
            <Text className="text-xs text-muted-foreground text-center mt-3">
              You can skip this — sharing also works without saved numbers.
            </Text>
          </>
        )}

        {step === 5 && (
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
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Your plan
                </Text>
                <Row
                  label="Diet"
                  value={
                    diet
                      ? `${DIET_ICON[diet]} ${
                          DIET_OPTIONS.find((d) => d.value === diet)?.title ?? ""
                        }`
                      : "—"
                  }
                />
                <Row label="Protein" value={`${goal}g / day`} />
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
      <View className="absolute left-0 right-0 bottom-0 border-t border-border bg-background px-5 pt-3 pb-6">
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
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
            <Text
              className={`text-base font-semibold ${
                canContinue ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              ✨ Generate My Week
            </Text>
          ) : (
            <>
              <Text
                className={`text-base font-semibold ${
                  canContinue
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Continue
              </Text>
              <Feather
                name="arrow-right"
                size={16}
                color={canContinue ? "#fefbf8" : "#6c6158"}
              />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2.5 border-b border-border/70">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground tabular-nums">
        {value}
      </Text>
    </View>
  );
}
