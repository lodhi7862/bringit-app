import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Image, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { createUser, UserRole } from "@/lib/store";

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions to select a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera permissions to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }

    if (!role) {
      Alert.alert("Role required", "Please select whether you are a parent or child.");
      return;
    }

    await createUser(name.trim(), role, avatarUri);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === "web") {
      handlePickImage();
      return;
    }
    
    Alert.alert(
      "Add Photo",
      "Choose an option",
      [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handlePickImage },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const selectRole = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={styles.title}>
            Welcome to BringIt
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Create your profile to get started with family coordination
          </ThemedText>
        </View>

        <View style={styles.form}>
          <Pressable
            onPress={showImageOptions}
            style={({ pressed }) => [
              styles.avatarContainer,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="camera" size={32} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                  Add Photo
                </ThemedText>
              </View>
            )}
          </Pressable>

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              Your Name
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              I am a...
            </ThemedText>
            <View style={styles.roleContainer}>
              <Pressable
                onPress={() => selectRole("parent")}
                style={({ pressed }) => [
                  styles.roleButton,
                  {
                    backgroundColor: role === "parent" ? theme.primary : theme.backgroundDefault,
                    borderColor: role === "parent" ? theme.primary : theme.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Feather 
                  name="user" 
                  size={24} 
                  color={role === "parent" ? Colors.light.buttonText : theme.text} 
                />
                <ThemedText 
                  type="h4" 
                  style={{ 
                    color: role === "parent" ? Colors.light.buttonText : theme.text,
                    marginTop: Spacing.sm,
                  }}
                >
                  Parent
                </ThemedText>
                <ThemedText 
                  type="caption" 
                  style={{ 
                    color: role === "parent" ? Colors.light.buttonText : theme.textSecondary,
                    textAlign: "center",
                    marginTop: Spacing.xs,
                  }}
                >
                  I create orders
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => selectRole("child")}
                style={({ pressed }) => [
                  styles.roleButton,
                  {
                    backgroundColor: role === "child" ? theme.primary : theme.backgroundDefault,
                    borderColor: role === "child" ? theme.primary : theme.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Feather 
                  name="users" 
                  size={24} 
                  color={role === "child" ? Colors.light.buttonText : theme.text} 
                />
                <ThemedText 
                  type="h4" 
                  style={{ 
                    color: role === "child" ? Colors.light.buttonText : theme.text,
                    marginTop: Spacing.sm,
                  }}
                >
                  Child
                </ThemedText>
                <ThemedText 
                  type="caption" 
                  style={{ 
                    color: role === "child" ? Colors.light.buttonText : theme.textSecondary,
                    textAlign: "center",
                    marginTop: Spacing.xs,
                  }}
                >
                  I complete orders
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <Button
            onPress={handleCreateProfile}
            disabled={!name.trim() || !role}
            style={styles.button}
          >
            Create Profile
          </Button>
        </View>

        <View style={styles.footer}>
          <ThemedText type="caption" style={{ color: theme.textTertiary, textAlign: "center" }}>
            Your profile is stored locally on this device only. No account or internet required.
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  form: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  label: {
    marginLeft: Spacing.xs,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: "100%",
    marginTop: Spacing.md,
  },
  footer: {
    marginTop: "auto",
    paddingTop: Spacing.xl,
  },
});
