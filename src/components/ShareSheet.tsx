import React, { forwardRef, useEffect, useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import {
  addContact,
  formatPhone,
  getContacts,
  normalizePhone,
  removeContact,
  type ShareContact,
} from "@/utils/contacts";

const inputStyle = {
  backgroundColor: "#f3ede6",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: 15,
  color: "#291f18",
} as const;

/** WhatsApp share sheet with saved contacts (design's ShareSheet). */
export const ShareSheet = forwardRef<BottomSheetModal, { message: string }>(
  function ShareSheet({ message }, ref) {
    const db = useSQLiteContext();
    const [contacts, setContacts] = useState<ShareContact[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    useEffect(() => {
      void getContacts(db).then(setContacts);
    }, [db]);

    const reset = () => {
      setSelected(new Set());
      setShowAdd(false);
      setName("");
      setPhone("");
    };

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

    const encoded = encodeURIComponent(message);

    const shareSelected = async () => {
      const targets = contacts.filter((c) => selected.has(c.id));
      for (const target of targets) {
        const url = `https://wa.me/${target.phone}?text=${encoded}`;
        const ok = await Linking.canOpenURL(url);
        if (!ok) {
          Alert.alert("WhatsApp not available", "Couldn't open WhatsApp.");
          return;
        }
        await Linking.openURL(url);
      }
    };

    const shareOther = async () => {
      await Share.share({ message });
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["70%"]}
        enableDynamicSizing={false}
        onDismiss={reset}
        backgroundStyle={{ backgroundColor: "#fffdfa" }}
        handleIndicatorStyle={{ backgroundColor: "#e3ddd5" }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <Text className="text-base font-bold text-foreground">
            Share weekly plan
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5 mb-4">
            Send this week's meals on WhatsApp.
          </Text>

          {contacts.map((c) => {
            const isSel = selected.has(c.id);
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
                    <Text className="text-xs text-muted-foreground mt-0.5">
                      {formatPhone(c.phone)}
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => void handleRemove(c.id)} hitSlop={8}>
                  <Feather name="trash-2" size={15} color="#6c6158" />
                </Pressable>
              </View>
            );
          })}

          {contacts.length === 0 && !showAdd ? (
            <Text className="text-center text-sm text-muted-foreground my-4">
              Save a number once, share every week with one tap.
            </Text>
          ) : null}

          {!showAdd ? (
            <Pressable
              onPress={() => setShowAdd(true)}
              className="h-12 rounded-xl border border-dashed border-border bg-secondary/30 flex-row items-center justify-center gap-2"
            >
              <Feather name="plus" size={15} color="#3a2a20" />
              <Text className="text-sm font-semibold text-foreground/80">
                Add contact
              </Text>
            </Pressable>
          ) : (
            <View className="rounded-2xl border border-border bg-card p-3">
              <Text className="text-xs font-medium text-muted-foreground mb-1.5">
                Name
              </Text>
              <BottomSheetTextInput
                placeholder="e.g. Amma"
                placeholderTextColor="#6c6158"
                value={name}
                onChangeText={setName}
                style={inputStyle}
              />
              <Text className="text-xs font-medium text-muted-foreground mb-1.5 mt-3">
                WhatsApp number (with country code)
              </Text>
              <BottomSheetTextInput
                placeholder="+91 98765 43210"
                placeholderTextColor="#6c6158"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                style={inputStyle}
              />
              <View className="flex-row items-center gap-2 mt-3">
                <Pressable
                  onPress={() => setShowAdd(false)}
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

          <Pressable
            onPress={() => void shareSelected()}
            disabled={selected.size === 0}
            className={`h-12 rounded-xl flex-row items-center justify-center gap-2 mt-4 ${
              selected.size === 0 ? "bg-secondary" : "bg-primary"
            }`}
          >
            <Feather
              name="send"
              size={15}
              color={selected.size === 0 ? "#6c6158" : "#fefbf8"}
            />
            <Text
              className={`text-sm font-semibold ${
                selected.size === 0
                  ? "text-muted-foreground"
                  : "text-primary-foreground"
              }`}
            >
              Send on WhatsApp{selected.size > 0 ? ` (${selected.size})` : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void shareOther()}
            className="h-10 items-center justify-center mt-1"
          >
            <Text className="text-xs font-semibold text-muted-foreground">
              Share another way
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
