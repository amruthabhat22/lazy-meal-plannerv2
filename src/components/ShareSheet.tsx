import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import type { Meal, Slot } from "@/engine/types";
import type { PlanRow } from "@/db/repos/plansRepo";
import { getRecipeByMealId } from "@/db/repos/mealsRepo";
import {
  addContact,
  formatPhone,
  getContacts,
  normalizePhone,
  removeContact,
  type ShareContact,
} from "@/utils/contacts";
import {
  buildPlanMessage,
  buildRecipeMessage,
  mealOccurrences,
} from "@/utils/shareMessage";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
} from "@/components/sheetChrome";

const WHATSAPP_GREEN = "#25D366";

const inputStyle = {
  backgroundColor: "#f3ede6",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: "#291f18",
} as const;

/**
 * "Share Weekly Plan" sheet (design). Sends the plan as WhatsApp text or as
 * a table image, and can send any planned meal's full recipe — the plan text
 * invites the recipient to ask for one.
 */
export const ShareSheet = forwardRef<
  BottomSheetModal,
  {
    planMeals: PlanRow[];
    catalog: Meal[];
    slots: Slot[];
    onShareImage: () => Promise<void>;
  }
>(function ShareSheet({ planMeals, catalog, slots, onShareImage }, ref) {
  const db = useSQLiteContext();
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [recipeQuery, setRecipeQuery] = useState("");
  const [busyImage, setBusyImage] = useState(false);

  useEffect(() => {
    void getContacts(db).then(setContacts);
  }, [db]);

  const reset = () => {
    setSelected(new Set());
    setOpened(new Set());
    setShowAdd(false);
    setName("");
    setPhone("");
    setRecipeQuery("");
  };

  const message = useMemo(
    () => buildPlanMessage(planMeals, catalog, slots),
    [planMeals, catalog, slots],
  );

  /** Distinct meals on this week's plan, for recipe sharing. */
  const weekMeals = useMemo(() => {
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const seen = new Map<string, Meal>();
    for (const pm of planMeals) {
      const meal = byId.get(pm.mealId);
      if (meal && !seen.has(meal.id)) seen.set(meal.id, meal);
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [planMeals, catalog]);

  const matchedMeals = useMemo(() => {
    const q = recipeQuery.trim().toLowerCase();
    if (!q) return [];
    return weekMeals.filter((m) => m.name.toLowerCase().includes(q));
  }, [weekMeals, recipeQuery]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canAdd = name.trim().length > 0 && normalizePhone(phone).length >= 8;

  const handleAdd = async () => {
    if (!canAdd) return;
    const contact = await addContact(db, name, phone);
    if (!contact) {
      Alert.alert("Already saved", "That number is already in your list.");
      return;
    }
    setContacts(await getContacts(db));
    setSelected((prev) => new Set(prev).add(contact.id));
    setName("");
    setPhone("");
    setShowAdd(false);
  };

  const handleRemove = async (id: string) => {
    await removeContact(db, id);
    setContacts(await getContacts(db));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const sendText = async (text: string) => {
    const targets = contacts.filter((c) => selected.has(c.id));
    if (targets.length === 0) {
      await Share.share({ message: text });
      return;
    }
    const encoded = encodeURIComponent(text);
    for (const target of targets) {
      const url = `https://wa.me/${target.phone}?text=${encoded}`;
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert("WhatsApp not available", "Couldn't open WhatsApp.");
        return;
      }
      await Linking.openURL(url);
      setOpened((prev) => new Set(prev).add(target.id));
    }
  };

  const shareRecipe = async (meal: Meal) => {
    const recipe = await getRecipeByMealId(db, meal.id);
    await sendText(buildRecipeMessage(meal, recipe, planMeals));
  };

  const shareImage = async () => {
    setBusyImage(true);
    try {
      await onShareImage();
    } catch {
      Alert.alert("Couldn't create image", "Please try again.");
    } finally {
      setBusyImage(false);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={["85%"]}
      enableDynamicSizing={false}
      onDismiss={reset}
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
    >
      <View className="px-5 pt-1 pb-3">
        <Text className="text-base font-bold text-foreground">
          Share Weekly Plan
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          Send your full 7-day plan on WhatsApp — to your cook, family, or
          yourself.
        </Text>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
      >
        {contacts.length === 0 && !showAdd ? (
          <View className="rounded-xl border border-dashed border-border bg-secondary/30 p-5 items-center">
            <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">
              <Feather name="phone" size={15} color="#a55a37" />
            </View>
            <Text className="text-sm font-semibold text-foreground">
              No saved contacts yet
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              Add a number to share your plan every week.
            </Text>
          </View>
        ) : null}

        {contacts.map((c) => {
          const isSel = selected.has(c.id);
          const wasOpened = opened.has(c.id);
          return (
            <View
              key={c.id}
              className={`flex-row items-center gap-3 rounded-xl border p-3 mb-2 ${
                isSel ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <Pressable
                onPress={() => toggle(c.id)}
                className="flex-row items-center gap-3 flex-1"
              >
                <View
                  className={`h-5 w-5 rounded-md border items-center justify-center ${
                    isSel
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {isSel ? (
                    <Feather name="check" size={12} color="#fefbf8" />
                  ) : null}
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-foreground">
                    {c.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {formatPhone(c.phone)}
                    {wasOpened ? (
                      <Text className="text-success font-medium">
                        {"  "}· Opened ✓
                      </Text>
                    ) : null}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => void handleRemove(c.id)} hitSlop={8}>
                <Feather name="trash-2" size={15} color="#6c6158" />
              </Pressable>
            </View>
          );
        })}

        {!showAdd ? (
          <Pressable
            onPress={() => setShowAdd(true)}
            className="h-12 rounded-xl border border-dashed border-border bg-secondary/30 flex-row items-center justify-center gap-2"
          >
            <Feather name="plus" size={15} color="#3a2a20" />
            <Text className="text-sm font-semibold text-foreground/80">
              Add new contact
            </Text>
          </Pressable>
        ) : (
          <View className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
            <BottomSheetTextInput
              placeholder="Name"
              placeholderTextColor="#6c6158"
              value={name}
              onChangeText={setName}
              style={inputStyle}
            />
            <View className="mt-2.5">
              <BottomSheetTextInput
                placeholder="Phone with country code (e.g. 919812345678)"
                placeholderTextColor="#6c6158"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                style={inputStyle}
              />
            </View>
            <View className="flex-row items-center gap-2 mt-3">
              <Pressable
                onPress={() => {
                  setShowAdd(false);
                  setName("");
                  setPhone("");
                }}
                className="h-12 px-4 rounded-xl items-center justify-center"
              >
                <Text className="text-sm font-medium text-muted-foreground">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleAdd()}
                disabled={!canAdd}
                className={`flex-1 h-12 rounded-xl items-center justify-center ${
                  canAdd ? "bg-primary" : "bg-secondary"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    canAdd ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Save contact
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Recipe sharing */}
        {weekMeals.length > 0 ? (
          <View className="mt-6">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Send a recipe
            </Text>
            <Text className="text-xs text-muted-foreground mb-2.5">
              Got asked for a recipe? Type the meal and send its full recipe —
              prep time, ease of cooking, ingredients, and steps.
            </Text>
            <BottomSheetTextInput
              placeholder="Type a meal from this week…"
              placeholderTextColor="#6c6158"
              value={recipeQuery}
              onChangeText={setRecipeQuery}
              style={inputStyle}
            />
            {matchedMeals.slice(0, 5).map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => void shareRecipe(meal)}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 mt-2"
              >
                <View className="h-8 w-8 rounded-full bg-primary/10 items-center justify-center">
                  <Feather name="book-open" size={13} color="#a55a37" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-foreground">
                    {meal.name}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground mt-0.5"
                    numberOfLines={1}
                  >
                    {mealOccurrences(meal.id, planMeals) || "On this week"}
                  </Text>
                </View>
                <Feather name="send" size={14} color="#25D366" />
              </Pressable>
            ))}
            {recipeQuery.trim().length > 0 && matchedMeals.length === 0 ? (
              <Text className="text-xs text-muted-foreground text-center mt-3">
                No meal on this week's plan matches "{recipeQuery.trim()}".
              </Text>
            ) : null}
          </View>
        ) : null}
      </BottomSheetScrollView>

      {/* Footer CTAs */}
      <View className="border-t border-border px-4 pt-3 pb-6 bg-background">
        <Pressable
          onPress={() => void sendText(message)}
          disabled={selected.size === 0}
          className="h-12 rounded-xl flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: selected.size === 0 ? "#f1eae0" : WHATSAPP_GREEN,
          }}
        >
          <Feather
            name="send"
            size={15}
            color={selected.size === 0 ? "#6c6158" : "#ffffff"}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: selected.size === 0 ? "#6c6158" : "#ffffff" }}
          >
            Share on WhatsApp{selected.size > 0 ? ` (${selected.size})` : ""}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void shareImage()}
          disabled={busyImage}
          className={`h-11 rounded-xl border border-border bg-card flex-row items-center justify-center gap-2 mt-2 ${
            busyImage ? "opacity-50" : ""
          }`}
        >
          <Feather name="image" size={14} color="#291f18" />
          <Text className="text-sm font-semibold text-foreground">
            {busyImage ? "Preparing image…" : "Share plan as image (table)"}
          </Text>
        </Pressable>
        <Text className="mt-2 text-[11px] text-muted-foreground text-center">
          WhatsApp opens once per contact. Tap send on each chat to deliver.
        </Text>
      </View>
    </BottomSheetModal>
  );
});
