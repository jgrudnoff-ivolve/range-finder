import React from "react";
import { Pressable, Text, View } from "react-native";

import { AppPalette, ScreenMode } from "../theme";

type Props = {
  palette: AppPalette;
  screen: ScreenMode;
  onOpenMenu: () => void;
};

export function AppHero({ palette, screen, onOpenMenu }: Props) {
  return (
    <View
      style={{
        backgroundColor: palette.surfaceStrong,
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        borderColor: palette.border,
        shadowColor: palette.shadow,
        shadowOpacity: 1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -24,
          top: -24,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: palette.accentSoft,
        }}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: palette.accentDark,
              fontSize: 12,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Photo Distance Tool
          </Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: "800",
              marginBottom: 8,
              color: palette.text,
            }}
          >
            Range Finder
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 20 }}>
            Calibrate once per device and zoom level, then estimate distance from photos.
          </Text>
        </View>

        <Pressable
          onPress={onOpenMenu}
          style={{
            backgroundColor: palette.chipNeutral,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minWidth: 92,
          }}
        >
          <Text
            style={{
              color: palette.text,
              fontWeight: "800",
              textAlign: "center",
              fontSize: 12,
              marginBottom: 2,
            }}
          >
            MENU
          </Text>
          <Text
            style={{
              color: palette.chipNeutralText,
              fontWeight: "700",
              textAlign: "center",
              fontSize: 11,
            }}
          >
            {screen === "estimate" ? "Estimate" : screen === "golf" ? "Golf" : "Calibration"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <View
          style={{
            backgroundColor: palette.accentSoft,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: palette.accentDark, fontWeight: "700", fontSize: 12 }}>
            1. Choose image
          </Text>
        </View>
        <View
          style={{
            backgroundColor: palette.greenSoft,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: palette.greenText, fontWeight: "700", fontSize: 12 }}>
            2. Mark object
          </Text>
        </View>
        <View
          style={{
            backgroundColor: palette.chipNeutral,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: palette.chipNeutralText, fontWeight: "700", fontSize: 12 }}>
            3. Run calculation
          </Text>
        </View>
      </View>
    </View>
  );
}
