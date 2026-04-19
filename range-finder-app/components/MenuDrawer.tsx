import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";

import { AppPalette, ScreenMode } from "../theme";

type Props = {
  palette: AppPalette;
  screen: ScreenMode;
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenMode) => void;
};

export function MenuDrawer({ palette, screen, open, onClose, onNavigate }: Props) {
  if (!open) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
      }}
    >
      <Pressable
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: "rgba(31, 26, 20, 0.32)",
        }}
      />

      <SafeAreaView
        style={{
          width: 290,
          height: "100%",
          backgroundColor: palette.surfaceStrong,
          borderRightWidth: 1,
          borderRightColor: palette.border,
          padding: 18,
          gap: 18,
          shadowColor: "#000",
          shadowOpacity: 0.14,
          shadowRadius: 16,
          shadowOffset: { width: 4, height: 0 },
          elevation: 6,
        }}
      >
        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: palette.accentDark,
              fontSize: 12,
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Navigate
          </Text>
          <Text style={{ color: palette.text, fontSize: 24, fontWeight: "800" }}>
            Menu
          </Text>
        </View>

        <Pressable
          onPress={() => onNavigate("estimate")}
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor: screen === "estimate" ? palette.menuActiveEstimate : "#f7f1e8",
            borderWidth: 1,
            borderColor:
              screen === "estimate" ? palette.menuActiveEstimateBorder : palette.border,
            gap: 6,
          }}
        >
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 17 }}>
            Estimate
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 20 }}>
            Main workflow for day-to-day distance checks.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onNavigate("golf")}
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor: screen === "golf" ? palette.menuActiveGolf : "#f7f1e8",
            borderWidth: 1,
            borderColor: screen === "golf" ? palette.menuActiveGolfBorder : palette.border,
            gap: 6,
          }}
        >
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 17 }}>
            Golf
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 20 }}>
            Open the live camera, auto-track the pin, and read distance while you frame the shot.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onNavigate("calibration")}
          style={{
            borderRadius: 18,
            padding: 16,
            backgroundColor:
              screen === "calibration" ? palette.menuActiveCalibration : "#f7f1e8",
            borderWidth: 1,
            borderColor:
              screen === "calibration"
                ? palette.menuActiveCalibrationBorder
                : palette.border,
            gap: 6,
          }}
        >
          <Text style={{ color: palette.text, fontWeight: "800", fontSize: 17 }}>
            Calibration
          </Text>
          <Text style={{ color: palette.muted, lineHeight: 20 }}>
            One-time setup for new devices or zoom levels.
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          style={{
            marginTop: "auto",
            backgroundColor: palette.chipNeutral,
            borderRadius: 14,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              color: palette.text,
              textAlign: "center",
              fontWeight: "800",
            }}
          >
            Close menu
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
