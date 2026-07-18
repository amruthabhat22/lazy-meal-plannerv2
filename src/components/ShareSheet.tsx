import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import {
  Check,
  ChefHat,
  Image as ImageIcon,
  Phone,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react-native";
import { useSQLiteContext } from "expo-sqlite";
import { Icon, ICON_COLORS } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
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
import { buildPlanMessage, buildRecipeMessage } from "@/utils/shareMessage";
import {
  renderSheetBackdrop,
  sheetBackgroundStyle,
  sheetHandleStyle,
  SheetHeader,
  useSheetFooterPadding,
  useSheetSizing,
} from "@/components/sheetChrome";
import { FONT_CLIP_FIX } from "@/utils/androidText";

const inputStyle = {
  backgroundColor: "#f3ede6",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: "#291f18",
} as const;

type ShareMode = "plan" | "recipe";

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="flex-row items-center gap-3.5 py-3"
    >
      <View
        className={`h-6 w-6 rounded-full border-2 items-center justify-center ${
          selected ? "border-primary" : "border-muted-foreground/30"
        }`}
      >
        {selected ? (
          <View className="h-3 w-3 rounded-full bg-primary" />
        ) : null}
      </View>
      <Text
        className={`text-base ${
          selected
            ? "font-semibold text-foreground"
            : "font-medium text-muted-foreground"
        }`}
       style={FONT_CLIP_FIX}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * "Share on WhatsApp" sheet (updated design): radio choice between the
 * weekly plan and a single recipe (searchable from this week's meals),
 * contact checklist, green CTA. Plan mode also offers the table-image
 * share.
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
  const sizing = useSheetSizing();
  const footerPadding = useSheetFooterPadding();
  const [mode, setMode] = useState<ShareMode>("plan");
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [pickedMeal, setPickedMeal] = useState<Meal | null>(null);
  const [busyImage, setBusyImage] = useState(false);

  useEffect(() => {
    void getContacts(db).then(setContacts);
  }, [db]);

  const reset = () => {
    setMode("plan");
    setSelected(new Set());
    setOpened(new Set());
    setShowAdd(false);
    setName("");
    setPhone("");
    setQuery("");
    setPickedMeal(null);
  };

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
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return weekMeals.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [weekMeals, query]);

  const canSend =
    selected.size > 0 && (mode === "plan" || pickedMeal !== null);

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

  const buildMessage = async (): Promise<string> => {
    if (mode === "recipe" && pickedMeal) {
      const recipe = await getRecipeByMealId(db, pickedMeal.id);
      return buildRecipeMessage(pickedMeal, recipe, planMeals);
    }
    return buildPlanMessage(planMeals, catalog, slots);
  };

  const send = async () => {
    if (!canSend) return;
    const text = await buildMessage();
    const encoded = encodeURIComponent(text);
    const targets = contacts.filter((c) => selected.has(c.id));
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
    if (targets.length === 0) await Share.share({ message: text });
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

  const mealMacros = (m: Meal) =>
    `${Math.round(m.protein_per_unit * m.default_qty)}g protein · ${Math.round(
      (m.kcal_per_unit ?? 0) * m.default_qty,
    )} cal`;

  return (
    <BottomSheetModal
      ref={ref}
      {...sizing}
      onDismiss={reset}
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={sheetBackgroundStyle}
      handleIndicatorStyle={sheetHandleStyle}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: footerPadding }}
        stickyHeaderIndices={[]}
      >
        <SheetHeader
          title="Share"
          subtitle="Send your weekly plan or a single recipe on WhatsApp."
        />

        {/* Mode radio group */}
        <View className="px-5 py-3">
          <RadioRow
            label="Weekly Meal Plan"
            selected={mode === "plan"}
            onPress={() => setMode("plan")}
          />
          <RadioRow
            label="Recipe"
            selected={mode === "recipe"}
            onPress={() => setMode("recipe")}
          />
        </View>

        <View className="px-5">
          {mode === "recipe" ? (
            <View className="mb-1">
              {pickedMeal ? (
                <View className="rounded-xl border border-primary bg-primary/5 p-3 flex-row items-center gap-3">
                  <View className="h-9 w-9 rounded-full bg-primary/10 items-center justify-center">
                    <Icon icon={ChefHat} size="sm" color={ICON_COLORS.primary} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-sm font-semibold text-foreground"
                      numberOfLines={1}
                     style={FONT_CLIP_FIX}>
                      {pickedMeal.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {mealMacros(pickedMeal)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setPickedMeal(null);
                      setQuery("");
                    }}
                    hitSlop={10}
                    accessibilityLabel="Change meal"
                    className="h-8 w-8 rounded-full items-center justify-center"
                  >
                    <Icon icon={X} size="sm" color={ICON_COLORS.muted} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <View className="relative">
                    <View
                      className="absolute left-3 top-0 bottom-0 justify-center z-10"
                      pointerEvents="none"
                    >
                      <Icon icon={Search} size="sm" color={ICON_COLORS.muted} />
                    </View>
                    <BottomSheetTextInput
                      placeholder="Search a meal from your plan"
                      placeholderTextColor="#6c6158"
                      value={query}
                      onChangeText={setQuery}
                      style={{ ...inputStyle, paddingLeft: 40 }}
                    />
                  </View>
                  {query.trim() !== "" && matchedMeals.length === 0 ? (
                    <View className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 mt-2">
                      <Text className="text-xs text-muted-foreground text-center">
                        No matching meal in this week's plan.
                      </Text>
                    </View>
                  ) : null}
                  {matchedMeals.length > 0 ? (
                    <View className="rounded-xl border border-border bg-card overflow-hidden mt-2">
                      {matchedMeals.map((m, i) => (
                        <Pressable
                          key={m.id}
                          onPress={() => setPickedMeal(m)}
                          className={`flex-row items-center gap-3 px-3 py-2.5 ${
                            i > 0 ? "border-t border-border" : ""
                          }`}
                        >
                          <Icon
                            icon={ChefHat}
                            size="sm"
                            color={ICON_COLORS.primary}
                          />
                          <View className="flex-1 min-w-0">
                            <Text
                              className="text-sm font-semibold text-foreground"
                              numberOfLines={1}
                             style={FONT_CLIP_FIX}>
                              {m.name}
                            </Text>
                            <Text className="text-xs text-muted-foreground tabular-nums">
                              {mealMacros(m)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
              <Text className="pt-3 pb-1 text-xs font-semibold tracking-widest uppercase text-muted-foreground" style={FONT_CLIP_FIX}>
                Send to
              </Text>
            </View>
          ) : null}

          {/* Contacts */}
          {contacts.length === 0 && !showAdd ? (
            <View className="rounded-xl border border-dashed border-border bg-secondary/30 p-5 items-center">
              <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                <Icon icon={Phone} size="sm" color={ICON_COLORS.primary} />
              </View>
              <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
                No saved contacts yet
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Add a number to share your plan.
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
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSel }}
                  className={`h-5 w-5 rounded-md border items-center justify-center ${
                    isSel
                      ? "bg-primary border-primary"
                      : "border-border bg-background"
                  }`}
                >
                  {isSel ? (
                    <Icon
                      icon={Check}
                      size={13}
                      color={ICON_COLORS.primaryForeground}
                    />
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => toggle(c.id)}
                  className="flex-1 min-w-0"
                >
                  <Text className="text-sm font-semibold text-foreground" style={FONT_CLIP_FIX}>
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
                </Pressable>
                <Pressable
                  onPress={() => void handleRemove(c.id)}
                  hitSlop={12}
                  accessibilityLabel={`Remove ${c.name}`}
                  className="h-8 w-8 rounded-full items-center justify-center"
                >
                  <Icon icon={Trash2} size="sm" color={ICON_COLORS.muted} />
                </Pressable>
              </View>
            );
          })}

          {!showAdd ? (
            <Pressable
              onPress={() => setShowAdd(true)}
              className="h-12 rounded-xl border border-dashed border-border bg-secondary/30 flex-row items-center justify-center gap-2"
            >
              <Icon icon={Plus} size="sm" color={ICON_COLORS.accentForeground} />
              <Text className="text-sm font-semibold text-foreground/80" style={FONT_CLIP_FIX}>
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
                <View className="flex-1">
                  <Button
                    label="Save contact"
                    rounded="xl"
                    onPress={() => void handleAdd()}
                    disabled={!canAdd}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="border-t border-border px-4 pt-3 mt-4">
          <Button
            label={`${mode === "recipe" ? "Share recipe" : "Share weekly plan"}${
              selected.size > 0 ? ` (${selected.size})` : ""
            }`}
            icon={Send}
            variant="whatsapp"
            rounded="xl"
            onPress={() => void send()}
            disabled={!canSend}
          />
          {mode === "plan" ? (
            <View className="mt-2">
              <Button
                label={
                  busyImage ? "Preparing image…" : "Share plan as image (table)"
                }
                icon={ImageIcon}
                variant="outline"
                rounded="xl"
                onPress={() => void shareImage()}
                disabled={busyImage}
              />
            </View>
          ) : null}
          <Text className="mt-2 text-xs text-muted-foreground text-center">
            {mode === "recipe" && !pickedMeal
              ? "Pick a meal from your plan to share its recipe."
              : "WhatsApp opens once per contact. Tap send on each chat to deliver."}
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
