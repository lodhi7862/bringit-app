import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, FlatList, Pressable, Alert, Platform, Image, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { 
  getState, 
  subscribe, 
  FamilyMember,
  ConnectionRequest,
} from "@/lib/store";
import {
  sendConnectionRequest as sendConnectionRequestApi,
  getIncomingRequests,
  getOutgoingRequests,
  acceptConnectionRequest as acceptConnectionRequestApi,
  rejectConnectionRequest as rejectConnectionRequestApi,
  getFamilyMembers,
  deleteFamilyConnection,
  ServerConnectionRequest,
} from "@/lib/api";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

function ProfileCard() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = getState().currentUser;

  const handleShowQR = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("QRCode");
  };

  return (
    <Card style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileAvatar, { backgroundColor: theme.backgroundSecondary }]}>
          {currentUser?.avatarSvg ? (
            <Image 
              source={{ uri: currentUser.avatarSvg }} 
              style={styles.avatarImage}
            />
          ) : (
            <Feather name="user" size={32} color={theme.textSecondary} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <ThemedText type="h3">{currentUser?.name || "Your Profile"}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            ID: {currentUser?.id?.slice(0, 8) || "---"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.profileActions}>
        <Pressable
          onPress={handleShowQR}
          style={({ pressed }) => [
            styles.profileButton,
            { 
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Feather name="maximize" size={18} color={Colors.light.buttonText} />
          <ThemedText type="small" style={{ color: Colors.light.buttonText, fontWeight: "600" }}>
            Show QR Code
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

function FamilyMemberCard({ 
  member, 
  onDelete 
}: { 
  member: FamilyMember; 
  onDelete: (id: string) => void;
}) {
  const { theme } = useTheme();

  const handleLongPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Remove Connection",
      `Are you sure you want to disconnect from ${member.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onDelete(member.id),
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card style={styles.memberCard} onPress={() => {}}>
      <Pressable onLongPress={handleLongPress} style={styles.memberContent}>
        <View style={[styles.memberAvatar, { backgroundColor: theme.backgroundSecondary }]}>
          {member.avatarSvg ? (
            <Image source={{ uri: member.avatarSvg }} style={styles.avatarImage} />
          ) : (
            <Feather name="user" size={24} color={theme.textSecondary} />
          )}
        </View>
        <View style={styles.memberInfo}>
          <ThemedText type="h4">{member.name}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Connected {formatDate(member.connectedAt)}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textTertiary} />
      </Pressable>
    </Card>
  );
}

function IncomingRequestCard({ 
  request, 
  onAccept,
  onReject,
}: { 
  request: ServerConnectionRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <Card style={styles.pendingCard}>
      <View style={styles.memberContent}>
        <View style={[styles.memberAvatar, { backgroundColor: theme.backgroundSecondary }]}>
          {request.fromUserAvatar ? (
            <Image source={{ uri: request.fromUserAvatar }} style={styles.avatarImage} />
          ) : (
            <Feather name="user" size={24} color={theme.textSecondary} />
          )}
        </View>
        <View style={styles.memberInfo}>
          <ThemedText type="h4">{request.fromUserName}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.primary }}>
            {request.fromUserRole === 'parent' ? 'Parent' : 'Child'} wants to connect
          </ThemedText>
        </View>
      </View>
      <View style={styles.pendingActions}>
        <Pressable
          onPress={() => onReject(request.id.toString())}
          style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="x" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={() => onAccept(request.id.toString())}
          style={[styles.actionButton, { backgroundColor: Colors.light.statusCompleted }]}
        >
          <Feather name="check" size={18} color={Colors.light.buttonText} />
        </Pressable>
      </View>
    </Card>
  );
}

function OutgoingRequestCard({ 
  request, 
  onCancel,
}: { 
  request: ServerConnectionRequest;
  onCancel: (id: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <Card style={[styles.pendingCard, { borderColor: theme.textTertiary }]}>
      <View style={styles.memberContent}>
        <View style={[styles.memberAvatar, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="user" size={24} color={theme.textSecondary} />
        </View>
        <View style={styles.memberInfo}>
          <ThemedText type="h4">{request.toUserName || 'Unknown User'}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Waiting for response...
          </ThemedText>
        </View>
      </View>
      <View style={styles.pendingActions}>
        <Pressable
          onPress={() => onCancel(request.id.toString())}
          style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="x" size={18} color={theme.text} />
        </Pressable>
      </View>
    </Card>
  );
}

function EmptyState({ onAddMember, isParent }: { onAddMember: () => void; isParent: boolean }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="users" size={64} color={theme.textTertiary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        No Family Members Yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
        {isParent 
          ? "Add family members to start sharing orders"
          : "Ask a parent to add you to their family"}
      </ThemedText>
      {isParent ? (
        <Button onPress={onAddMember} style={styles.addButton}>
          Add Family Member
        </Button>
      ) : null}
    </View>
  );
}

function ConnectMemberModal({
  visible,
  onClose,
  onScanQR,
  onEnterCode,
}: {
  visible: boolean;
  onClose: () => void;
  onScanQR: () => void;
  onEnterCode: () => void;
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
        <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
          <ThemedText type="h3" style={styles.modalTitle}>Connect Family Member</ThemedText>
          <ThemedText type="body" style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Family members must create their own profile first, then connect via QR code or user code
          </ThemedText>
          <View style={styles.connectOptions}>
            <Pressable
              onPress={onScanQR}
              style={({ pressed }) => [
                styles.connectOption,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.connectIconWrap, { backgroundColor: theme.primary }]}>
                <Feather name="camera" size={24} color={Colors.light.buttonText} />
              </View>
              <View style={styles.connectOptionText}>
                <ThemedText type="h4">Scan QR Code</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Scan their QR code from Family tab
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textTertiary} />
            </Pressable>
            <Pressable
              onPress={onEnterCode}
              style={({ pressed }) => [
                styles.connectOption,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.connectIconWrap, { backgroundColor: theme.primary }]}>
                <Feather name="hash" size={24} color={Colors.light.buttonText} />
              </View>
              <View style={styles.connectOptionText}>
                <ThemedText type="h4">Enter User Code</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Type their 8-character code
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textTertiary} />
            </Pressable>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EnterCodeModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const { theme } = useTheme();
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    if (code.trim().length >= 8 && !isLoading) {
      onSubmit(code.trim());
    }
  };

  const handleCancel = () => {
    setCode("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKeyboardAvoid}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancel}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onPress={() => {}}>
            <ThemedText type="h3" style={styles.modalTitle}>Enter User Code</ThemedText>
            <ThemedText type="body" style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Ask them for their 8-character code from their Family tab
            </ThemedText>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: error ? Colors.light.statusError : theme.backgroundTertiary,
                  textAlign: "center",
                  fontSize: 20,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                },
              ]}
              placeholder="XXXXXXXX"
              placeholderTextColor={theme.textTertiary}
              value={code}
              onChangeText={(text) => setCode(text.slice(0, 12))}
              autoFocus
              autoCapitalize="characters"
              editable={!isLoading}
            />
            {error ? (
              <ThemedText type="small" style={{ color: Colors.light.statusError, marginTop: Spacing.xs, textAlign: 'center' }}>
                {error}
              </ThemedText>
            ) : null}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleCancel}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.modalButton, { backgroundColor: theme.primary, opacity: code.length >= 8 && !isLoading ? 1 : 0.5 }]}
                disabled={code.length < 8 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.light.buttonText} />
                ) : (
                  <ThemedText type="body" style={{ color: Colors.light.buttonText, fontWeight: "600" }}>Connect</ThemedText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FamilyScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ServerConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ServerConnectionRequest[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showEnterCodeModal, setShowEnterCodeModal] = useState(false);
  const [isParent, setIsParent] = useState(getState().currentUser?.role === 'parent');
  const [isLoading, setIsLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;
    
    try {
      const [incoming, outgoing, members] = await Promise.all([
        getIncomingRequests(currentUser.id),
        getOutgoingRequests(currentUser.id),
        getFamilyMembers(currentUser.id),
      ]);
      
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setFamilyMembers(members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        role: m.role as 'parent' | 'child',
        avatarSvg: m.avatarSvg,
        connectedAt: new Date(m.connectedAt).getTime(),
        status: 'accepted' as const,
      })));
    } catch (error) {
      console.error("Error fetching family data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      pollingRef.current = setInterval(fetchData, 5000);
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }, [fetchData])
  );

  useEffect(() => {
    const newState = getState();
    setIsParent(newState.currentUser?.role === 'parent');
  }, []);

  const handleDelete = async (id: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;
    
    const success = await deleteFamilyConnection(id, currentUser.id);
    if (success) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      fetchData();
    } else {
      Alert.alert("Error", "Failed to remove connection. Please try again.");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;
    
    const result = await acceptConnectionRequestApi(parseInt(requestId), currentUser.id);
    if (result.success) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      fetchData();
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;
    
    await rejectConnectionRequestApi(parseInt(requestId), currentUser.id);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    fetchData();
  };

  const handleCancelRequest = async (requestId: string) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;
    
    await rejectConnectionRequestApi(parseInt(requestId), currentUser.id);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    fetchData();
  };

  const handleAddMember = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowConnectModal(true);
  };

  const handleScanQR = () => {
    setShowConnectModal(false);
    navigation.navigate("QRScanner");
  };

  const handleEnterCode = () => {
    setShowConnectModal(false);
    setCodeError(null);
    setShowEnterCodeModal(true);
  };

  const handleCodeSubmit = async (code: string) => {
    const trimmedCode = code.trim();
    setCodeError(null);
    
    if (!trimmedCode) {
      setCodeError("Please enter a valid code.");
      return;
    }
    
    const currentUser = getState().currentUser;
    if (!currentUser) {
      setCodeError("Please set up your profile first.");
      return;
    }
    
    if (trimmedCode === currentUser.id) {
      setCodeError("You cannot connect with yourself.");
      return;
    }
    
    setIsLoading(true);
    
    const result = await sendConnectionRequestApi({
      fromUserId: currentUser.id,
      fromUserName: currentUser.name,
      fromUserRole: currentUser.role,
      fromUserAvatar: currentUser.avatarSvg,
      toUserId: trimmedCode.toLowerCase(),
    });
    
    setIsLoading(false);
    
    if (result.success) {
      setShowEnterCodeModal(false);
      Alert.alert(
        "Request Sent",
        `A connection request has been sent to ${result.targetUser?.name || 'this user'}. They will need to accept it on their device.`,
        [{ text: "OK" }]
      );
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      fetchData();
    } else {
      setCodeError(result.error || "Could not send connection request. Please try again.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={familyMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        ListHeaderComponent={
          <>
            <ProfileCard />
            {incomingRequests.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Connection Requests
                </ThemedText>
                {incomingRequests.map((request) => (
                  <IncomingRequestCard
                    key={request.id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))}
              </View>
            ) : null}
            {isParent && outgoingRequests.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Pending Invites
                </ThemedText>
                {outgoingRequests.map((request) => (
                  <OutgoingRequestCard
                    key={request.id}
                    request={request}
                    onCancel={handleCancelRequest}
                  />
                ))}
              </View>
            ) : null}
            {familyMembers.length > 0 ? (
              <View style={styles.sectionHeader}>
                <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  Connected Family
                </ThemedText>
                {isParent ? (
                  <Pressable
                    onPress={handleAddMember}
                    style={({ pressed }) => [
                      styles.addIconButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="user-plus" size={20} color={theme.primary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={<EmptyState onAddMember={handleAddMember} isParent={isParent} />}
        renderItem={({ item }) => (
          <FamilyMemberCard member={item} onDelete={handleDelete} />
        )}
        showsVerticalScrollIndicator={false}
      />
      <ConnectMemberModal
        visible={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onScanQR={handleScanQR}
        onEnterCode={handleEnterCode}
      />
      <EnterCodeModal
        visible={showEnterCodeModal}
        onClose={() => {
          setShowEnterCodeModal(false);
          setCodeError(null);
        }}
        onSubmit={handleCodeSubmit}
        isLoading={isLoading}
        error={codeError}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  profileCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  profileActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addIconButton: {
    padding: Spacing.xs,
  },
  memberCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  pendingCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  memberContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  memberInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  pendingActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    justifyContent: "flex-end",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["2xl"],
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
    width: 200,
  },
  modalKeyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  modalInput: {
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  connectOptions: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  connectOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  connectIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  connectOptionText: {
    flex: 1,
    gap: Spacing.xs,
  },
  cancelButton: {
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
