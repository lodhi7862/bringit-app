import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Alert, Platform, Modal, Image, TextInput } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { 
  getState, 
  subscribe, 
  removeSavedItem, 
  addSavedItem,
  assignTask,
  SavedItem,
  FamilyMember 
} from "@/lib/store";
import { getFamilyMembers } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@/lib/toast";
import { uploadImage } from "@/lib/query-client";

function AddItemModal({
  visible,
  imageUri,
  onClose,
  onSave,
}: {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [itemName, setItemName] = useState("");

  const handleSave = () => {
    onSave(itemName);
    setItemName("");
    onClose();
  };

  const handleClose = () => {
    setItemName("");
    onClose();
  };

  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.addItemModalScroll}
        >
          <ThemedView style={[styles.addItemModal, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Add New Item</ThemedText>
              <Pressable onPress={handleClose}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={[styles.addItemPreview, { backgroundColor: theme.backgroundSecondary }]}>
              <Image source={{ uri: imageUri }} style={styles.addItemImage} />
            </View>

            <TextInput
              style={[styles.itemNameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
              placeholder="Enter item name (optional)"
              placeholderTextColor={theme.textTertiary}
              value={itemName}
              onChangeText={setItemName}
              autoFocus
            />

            <View style={styles.addItemButtons}>
              <Pressable
                onPress={handleClose}
                style={[styles.addItemButton, styles.cancelButton, { borderColor: theme.border }]}
              >
                <ThemedText type="body" style={{ textAlign: "center" }}>Cancel</ThemedText>
              </Pressable>
              <Button 
                onPress={handleSave}
                style={styles.addItemButton}
              >
                Save Item
              </Button>
            </View>
          </ThemedView>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

function ItemCard({ 
  item, 
  isEditMode, 
  onDelete,
  onAssign,
}: { 
  item: SavedItem; 
  isEditMode: boolean;
  onDelete: (id: string) => void;
  onAssign: (item: SavedItem) => void;
}) {
  const { theme } = useTheme();

  const handleLongPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.name || "this item"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAssign(item);
  };

  return (
    <Card style={styles.itemCard}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={styles.itemContent}
      >
        <View style={[styles.itemImage, { backgroundColor: theme.backgroundSecondary }]}>
          {item.svgData ? (
            <Image source={{ uri: item.svgData }} style={styles.itemImageContent} />
          ) : (
            <Feather name="image" size={32} color={theme.textTertiary} />
          )}
        </View>
        {item.name ? (
          <ThemedText type="small" numberOfLines={2} style={styles.itemName}>
            {item.name}
          </ThemedText>
        ) : null}
        {isEditMode ? (
          <Pressable
            onPress={() => onDelete(item.id)}
            style={[styles.deleteButton, { backgroundColor: Colors.light.statusError }]}
          >
            <Feather name="x" size={16} color="#FFF" />
          </Pressable>
        ) : null}
        <View style={[styles.assignBadge, { backgroundColor: theme.primary }]}>
          <Feather name="send" size={12} color={Colors.light.buttonText} />
        </View>
      </Pressable>
    </Card>
  );
}

function AssignModal({
  visible,
  item,
  onClose,
  onAssign,
  familyMembers,
}: {
  visible: boolean;
  item: SavedItem | null;
  onClose: () => void;
  onAssign: (item: SavedItem, memberId: string, memberName: string, quantity: number, note: string) => void;
  familyMembers: FamilyMember[];
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const children = familyMembers.filter(m => m.role === 'child' && m.status === 'accepted');

  const handleAssign = () => {
    if (!item || !selectedMember) return;
    const member = children.find(m => m.id === selectedMember);
    if (!member) return;
    onAssign(item, member.userId, member.name, quantity, note);
    setSelectedMember(null);
    setQuantity(1);
    setNote("");
    onClose();
  };

  const handleClose = () => {
    setSelectedMember(null);
    setQuantity(1);
    setNote("");
    onClose();
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.assignModal, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">Assign to Child</ThemedText>
            <Pressable onPress={handleClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={[styles.itemPreview, { backgroundColor: theme.backgroundSecondary }]}>
            {item.svgData ? (
              <Image source={{ uri: item.svgData }} style={styles.previewImage} />
            ) : (
              <Feather name="image" size={40} color={theme.textTertiary} />
            )}
            <ThemedText type="h4" style={styles.previewName}>
              {item.name || "Item"}
            </ThemedText>
          </View>

          <View style={styles.quantitySection}>
            <ThemedText type="body">Quantity:</ThemedText>
            <View style={styles.quantityControls}>
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="minus" size={18} color={theme.text} />
              </Pressable>
              <ThemedText type="h3" style={styles.quantityText}>{quantity}</ThemedText>
              <Pressable
                onPress={() => setQuantity(quantity + 1)}
                style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="plus" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[styles.noteInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={theme.textTertiary}
            value={note}
            onChangeText={setNote}
          />

          {children.length === 0 ? (
            <View style={styles.noChildren}>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                No children connected yet. Add family members in the Family tab.
              </ThemedText>
            </View>
          ) : (
            <>
              <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                Select a child:
              </ThemedText>
              <FlatList
                data={children}
                keyExtractor={(m) => m.id}
                style={styles.memberList}
                renderItem={({ item: member }) => (
                  <Pressable
                    onPress={() => setSelectedMember(member.id)}
                    style={[
                      styles.memberRow,
                      { 
                        backgroundColor: selectedMember === member.id 
                          ? theme.primary + "20" 
                          : theme.backgroundSecondary,
                        borderColor: selectedMember === member.id 
                          ? theme.primary 
                          : "transparent",
                      },
                    ]}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: theme.backgroundDefault }]}>
                      {member.avatarSvg ? (
                        <Image source={{ uri: member.avatarSvg }} style={styles.avatarImage} />
                      ) : (
                        <Feather name="user" size={20} color={theme.textSecondary} />
                      )}
                    </View>
                    <ThemedText type="body" style={{ flex: 1 }}>{member.name}</ThemedText>
                    {selectedMember === member.id ? (
                      <Feather name="check-circle" size={20} color={theme.primary} />
                    ) : null}
                  </Pressable>
                )}
              />
            </>
          )}

          <Button
            onPress={handleAssign}
            disabled={!selectedMember}
            style={styles.assignButton}
          >
            Assign Task
          </Button>
        </ThemedView>
      </View>
    </Modal>
  );
}

function PhotoSourceModal({
  visible,
  onClose,
  onCamera,
  onGallery,
}: {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.photoSourceModal, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
          <ThemedText type="h3" style={styles.modalTitle}>Add Item</ThemedText>
          <ThemedText type="body" style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Choose how to add your item photo
          </ThemedText>
          <View style={styles.photoSourceOptions}>
            <Pressable
              onPress={onCamera}
              style={({ pressed }) => [
                styles.photoSourceOption,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.photoSourceIconWrap, { backgroundColor: theme.primary }]}>
                <Feather name="camera" size={28} color={Colors.light.buttonText} />
              </View>
              <View style={styles.photoSourceOptionText}>
                <ThemedText type="h4">Take Photo</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Use your camera
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={24} color={theme.textTertiary} />
            </Pressable>
            <Pressable
              onPress={onGallery}
              style={({ pressed }) => [
                styles.photoSourceOption,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.photoSourceIconWrap, { backgroundColor: theme.primary }]}>
                <Feather name="image" size={28} color={Colors.light.buttonText} />
              </View>
              <View style={styles.photoSourceOptionText}>
                <ThemedText type="h4">From Gallery</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Choose from your photos
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={24} color={theme.textTertiary} />
            </Pressable>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.photoSourceCancelButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EmptyState({ onAddItem }: { onAddItem: () => void }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="shopping-bag" size={64} color={theme.textTertiary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Items Yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        Add items by taking photos, then assign them to your children
      </ThemedText>
      <Button onPress={onAddItem} style={styles.addButton}>
        Add First Item
      </Button>
    </View>
  );
}

export default function SavedItemsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  const loadFamilyMembers = useCallback(async () => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;
    
    try {
      const members = await getFamilyMembers(currentUser.id);
      const mappedMembers: FamilyMember[] = members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        role: m.role as 'parent' | 'child',
        avatarSvg: m.avatarSvg,
        connectedAt: new Date(m.connectedAt).getTime(),
        status: 'accepted' as const,
      }));
      setFamilyMembers(mappedMembers);
    } catch (error) {
      console.error("Error loading family members:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFamilyMembers();
    }, [loadFamilyMembers])
  );

  useEffect(() => {
    const state = getState();
    setItems(state.savedItems);
    
    const unsubscribe = subscribe(() => {
      const newState = getState();
      setItems([...newState.savedItems]);
    });
    return unsubscribe;
  }, []);

  const handleDelete = (id: string) => {
    removeSavedItem(id);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAssignItem = (item: SavedItem) => {
    setSelectedItem(item);
    setShowAssignModal(true);
  };

  const handleAssign = async (item: SavedItem, memberId: string, memberName: string, quantity: number, note: string) => {
    const task = await assignTask(item, memberId, memberName, quantity, note || null);
    if (task) {
      showToast(`"${item.name || "Item"}" assigned to ${memberName}`, "success");
    } else {
      showToast("Failed to assign task", "error");
    }
  };

  const handleAddItem = () => {
    setShowPhotoSourceModal(true);
  };

  const handleCameraPhoto = async () => {
    setShowPhotoSourceModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera permissions to add items.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
      setShowAddItemModal(true);
    }
  };

  const handleGalleryPhoto = async () => {
    setShowPhotoSourceModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant photo library permissions to add items.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
      setShowAddItemModal(true);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleSaveItem = async (name: string) => {
    if (pendingImageUri) {
      setIsUploading(true);
      try {
        const serverUrl = await uploadImage(pendingImageUri);
        addSavedItem({
          svgData: serverUrl,
          name: name || null,
          lastNote: null,
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showToast("Item saved", "success");
      } catch (error) {
        console.error("Failed to upload image:", error);
        showToast("Failed to save item - please try again", "error");
      } finally {
        setIsUploading(false);
        setPendingImageUri(null);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        columnWrapperStyle={items.length > 0 ? styles.row : undefined}
        ListEmptyComponent={<EmptyState onAddItem={handleAddItem} />}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.header}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Tap an item to assign it to a child
              </ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          items.length > 0 ? (
            <Pressable
              onPress={handleAddItem}
              style={[styles.centeredAddButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="plus" size={32} color={Colors.light.buttonText} />
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <ItemCard 
            item={item} 
            isEditMode={isEditMode}
            onDelete={handleDelete}
            onAssign={handleAssignItem}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <AssignModal
        visible={showAssignModal}
        item={selectedItem}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedItem(null);
        }}
        onAssign={handleAssign}
        familyMembers={familyMembers}
      />

      <AddItemModal
        visible={showAddItemModal}
        imageUri={pendingImageUri}
        onClose={() => {
          setShowAddItemModal(false);
          setPendingImageUri(null);
        }}
        onSave={handleSaveItem}
      />

      <PhotoSourceModal
        visible={showPhotoSourceModal}
        onClose={() => setShowPhotoSourceModal(false)}
        onCamera={handleCameraPhoto}
        onGallery={handleGalleryPhoto}
      />

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  itemCard: {
    width: "48%",
    padding: Spacing.md,
  },
  itemContent: {
    alignItems: "center",
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  itemImageContent: {
    width: "100%",
    height: "100%",
  },
  itemName: {
    textAlign: "center",
  },
  deleteButton: {
    position: "absolute",
    top: -Spacing.sm,
    right: -Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  assignBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["4xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 260,
    marginBottom: Spacing.xl,
  },
  addButton: {
    width: 180,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  assignModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  itemPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  previewName: {
    flex: 1,
  },
  quantitySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    minWidth: 30,
    textAlign: "center",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  memberList: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 2,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  noChildren: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  assignButton: {
    marginTop: Spacing.sm,
  },
  addItemModalScroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  addItemModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  addItemPreview: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.md,
    alignSelf: "center",
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  addItemImage: {
    width: "100%",
    height: "100%",
  },
  itemNameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  addItemButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  addItemButton: {
    flex: 1,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  photoSourceModal: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  photoSourceOptions: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  photoSourceOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  photoSourceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  photoSourceOptionText: {
    flex: 1,
  },
  photoSourceCancelButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  centeredAddButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
