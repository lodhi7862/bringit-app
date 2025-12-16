import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  FlatList, 
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { 
  getState, 
  subscribe, 
  createOrder, 
  addSavedItem,
  FamilyMember,
  SavedItem,
} from "@/lib/store";
import { sendOrderNotification } from "@/lib/notifications";
import { getFamilyMembers } from "@/lib/api";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface OrderItemDraft {
  id: string;
  savedItemId: string;
  svgData: string;
  name: string | null;
  quantity: number;
  note: string;
}

function RecipientPicker({ 
  members, 
  selectedId, 
  onSelect 
}: { 
  members: FamilyMember[]; 
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { theme } = useTheme();
  const selected = members.find(m => m.id === selectedId);

  const [showPicker, setShowPicker] = useState(false);

  if (members.length === 0) {
    return (
      <View style={[styles.recipientContainer, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          No family members connected yet
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.recipientContainer, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Sending to:
        </ThemedText>
        <View style={styles.recipientValue}>
          <ThemedText type="h4" style={{ color: theme.primary }}>
            {selected?.name || "Select recipient"}
          </ThemedText>
          <Feather name="chevron-down" size={18} color={theme.primary} />
        </View>
      </Pressable>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <ThemedText type="h3">Select Recipient</ThemedText>
              <Pressable onPress={() => setShowPicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    setShowPicker(false);
                  }}
                  style={[
                    styles.pickerItem,
                    item.id === selectedId && { backgroundColor: theme.backgroundDefault },
                  ]}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="user" size={20} color={theme.textSecondary} />
                  </View>
                  <ThemedText type="body">{item.name}</ThemedText>
                  {item.id === selectedId ? (
                    <Feather name="check" size={20} color={theme.primary} style={{ marginLeft: "auto" }} />
                  ) : null}
                </Pressable>
              )}
            />
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

function OrderItemRow({ 
  item, 
  onUpdate, 
  onRemove 
}: { 
  item: OrderItemDraft;
  onUpdate: (id: string, updates: Partial<OrderItemDraft>) => void;
  onRemove: (id: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <Card style={styles.itemRow}>
      <View style={styles.itemRowContent}>
        <View style={[styles.itemImage, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="image" size={24} color={theme.textTertiary} />
        </View>
        <View style={styles.itemDetails}>
          <View style={styles.quantityRow}>
            <Pressable
              onPress={() => {
                if (item.quantity > 1) {
                  onUpdate(item.id, { quantity: item.quantity - 1 });
                }
              }}
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="h4" style={styles.quantityText}>
              {item.quantity}
            </ThemedText>
            <Pressable
              onPress={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
          <TextInput
            style={[styles.noteInput, { color: theme.text, borderColor: theme.border }]}
            placeholder="Add note (e.g., 1kg, large)"
            placeholderTextColor={theme.textTertiary}
            value={item.note}
            onChangeText={(text) => onUpdate(item.id, { note: text })}
          />
        </View>
        <Pressable
          onPress={() => onRemove(item.id)}
          style={styles.removeButton}
        >
          <Feather name="x" size={20} color={Colors.light.statusError} />
        </Pressable>
      </View>
    </Card>
  );
}

function EmptyItems({ onAddPhoto, onAddFromSaved }: { onAddPhoto: () => void; onAddFromSaved: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyItems}>
      <Pressable
        onPress={onAddPhoto}
        style={[styles.emptyButton, { backgroundColor: theme.backgroundDefault }]}
      >
        <Feather name="camera" size={48} color={theme.textTertiary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          Take a photo to add item
        </ThemedText>
      </Pressable>
    </View>
  );
}

function SavedItemsPicker({
  visible,
  onClose,
  onSelect,
  savedItems,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: SavedItem) => void;
  savedItems: SavedItem[];
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.savedItemsModal, { paddingBottom: insets.bottom }]}>
          <View style={styles.pickerHeader}>
            <ThemedText type="h3">Add from Saved Items</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          {savedItems.length === 0 ? (
            <View style={styles.emptyPicker}>
              <Feather name="inbox" size={48} color={theme.textTertiary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                No saved items yet
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={savedItems}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.savedItemsGrid}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={[styles.savedItemCell, { backgroundColor: theme.backgroundDefault }]}
                >
                  <View style={[styles.savedItemImage, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="image" size={24} color={theme.textTertiary} />
                  </View>
                  {item.name ? (
                    <ThemedText type="caption" numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  ) : null}
                </Pressable>
              )}
            />
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

export default function CreateOrderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [items, setItems] = useState<OrderItemDraft[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showSavedPicker, setShowSavedPicker] = useState(false);

  const loadFamilyMembers = useCallback(async () => {
    const currentUser = getState().currentUser;
    if (currentUser) {
      const serverMembers = await getFamilyMembers(currentUser.id);
      const mappedMembers: FamilyMember[] = serverMembers.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        role: m.role as 'parent' | 'child',
        avatarSvg: m.avatarSvg,
        connectedAt: new Date(m.connectedAt).getTime(),
        status: 'accepted' as const,
      }));
      setFamilyMembers(mappedMembers);
      
      if (mappedMembers.length === 1 && !selectedRecipient) {
        setSelectedRecipient(mappedMembers[0].id);
      }
    }
  }, [selectedRecipient]);

  useFocusEffect(
    useCallback(() => {
      loadFamilyMembers();
    }, [loadFamilyMembers])
  );

  useEffect(() => {
    const state = getState();
    setSavedItems(state.savedItems);
    
    const unsubscribe = subscribe(() => {
      const newState = getState();
      setSavedItems([...newState.savedItems]);
    });
    return unsubscribe;
  }, []);

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera permissions.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.3,
    });

    if (!result.canceled && result.assets[0]) {
      const saved = addSavedItem({
        svgData: result.assets[0].uri,
        name: null,
        lastNote: null,
      });

      const newItem: OrderItemDraft = {
        id: Math.random().toString(36).substr(2, 9),
        savedItemId: saved.id,
        svgData: result.assets[0].uri,
        name: null,
        quantity: 1,
        note: "",
      };
      setItems([...items, newItem]);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleAddFromSaved = (savedItem: SavedItem) => {
    const newItem: OrderItemDraft = {
      id: Math.random().toString(36).substr(2, 9),
      savedItemId: savedItem.id,
      svgData: savedItem.svgData,
      name: savedItem.name,
      quantity: 1,
      note: "",
    };
    setItems([...items, newItem]);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<OrderItemDraft>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSendOrder = async () => {
    if (!selectedRecipient) {
      Alert.alert("Select Recipient", "Please select who to send this order to.");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Add Items", "Please add at least one item to the order.");
      return;
    }

    const recipient = familyMembers.find(m => m.id === selectedRecipient);
    if (!recipient) return;

    const currentUser = getState().currentUser;
    
    createOrder(
      recipient.userId,
      recipient.name,
      items.map(item => ({
        savedItemId: item.savedItemId,
        svgData: item.svgData,
        name: item.name,
        quantity: item.quantity,
        note: item.note || null,
      }))
    );

    if (currentUser) {
      sendOrderNotification(currentUser.id, recipient.name, items.length);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    navigation.goBack();
  };

  const canSend = items.length > 0 && selectedRecipient !== null;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <RecipientPicker
          members={familyMembers}
          selectedId={selectedRecipient}
          onSelect={setSelectedRecipient}
        />

        {items.length === 0 ? (
          <EmptyItems 
            onAddPhoto={handleAddPhoto} 
            onAddFromSaved={() => setShowSavedPicker(true)} 
          />
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <OrderItemRow
                key={item.id}
                item={item}
                onUpdate={handleUpdateItem}
                onRemove={handleRemoveItem}
              />
            ))}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
        {items.length > 0 ? (
          <View style={styles.actionButtons}>
            <Pressable
              onPress={() => setShowSavedPicker(true)}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
            >
              <Feather name="grid" size={18} color={theme.text} />
              <ThemedText type="small">From Saved</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleAddPhoto}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
            >
              <Feather name="camera" size={18} color={theme.text} />
              <ThemedText type="small">Take Photo</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <Button onPress={handleSendOrder} disabled={!canSend}>
          Send Order ({items.length} {items.length === 1 ? "item" : "items"})
        </Button>
      </View>

      <SavedItemsPicker
        visible={showSavedPicker}
        onClose={() => setShowSavedPicker(false)}
        onSelect={handleAddFromSaved}
        savedItems={savedItems}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  recipientContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  recipientValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  itemsList: {
    gap: Spacing.md,
  },
  itemRow: {
    padding: Spacing.md,
  },
  itemRowContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  itemDetails: {
    flex: 1,
    gap: Spacing.sm,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    minWidth: 24,
    textAlign: "center",
  },
  noteInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  emptyItems: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["4xl"],
  },
  emptyButton: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerModal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "50%",
  },
  savedItemsModal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "70%",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  pickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  savedItemsGrid: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  savedItemCell: {
    flex: 1,
    margin: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  savedItemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emptyPicker: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
});
