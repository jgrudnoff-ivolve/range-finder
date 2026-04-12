import React from "react";
import { Pressable, Text, View } from "react-native";

import { CalibrationProfile } from "../types";
import { AppPalette } from "../theme";

type Props = {
  palette: AppPalette;
  profiles: CalibrationProfile[];
  onUse: (profile: CalibrationProfile) => void;
  onDelete: (profile: CalibrationProfile) => void;
};

export function CalibrationProfilesCard({
  palette,
  profiles,
  onUse,
  onDelete,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 10,
      }}
    >
      <Text style={{ fontWeight: "700", color: palette.text, fontSize: 18 }}>
        Saved Calibration Profiles
      </Text>
      <Text style={{ color: palette.muted, fontSize: 13 }}>
        Reuse focal length values for the same device and zoom level. Profiles can be deleted here.
      </Text>

      {profiles.length === 0 ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: palette.border,
            padding: 16,
            backgroundColor: palette.surfaceStrong,
          }}
        >
          <Text style={{ color: palette.muted }}>No saved profiles yet.</Text>
        </View>
      ) : (
        profiles.map((profile) => (
          <View
            key={profile.id}
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: 18,
              padding: 14,
              gap: 10,
              backgroundColor: palette.surfaceStrong,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: palette.text, flex: 1 }}>
                {profile.name}
              </Text>
              <View
                style={{
                  backgroundColor: palette.accentSoft,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: palette.accentDark, fontWeight: "700", fontSize: 12 }}>
                  {profile.focalLengthPixels} px
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => onUse(profile)}
                style={{
                  flex: 1,
                  backgroundColor: palette.accent,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  Use
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onDelete(profile)}
                style={{
                  flex: 1,
                  backgroundColor: palette.chipNeutral,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "700",
                    color: palette.text,
                  }}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
