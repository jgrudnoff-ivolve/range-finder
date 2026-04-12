import React from "react";
import { Pressable, Text, View } from "react-native";

import { CalibrationProfile } from "../types";
import { AppPalette } from "../theme";

type Props = {
  palette: AppPalette;
  profiles: CalibrationProfile[];
  selectedProfile?: CalibrationProfile;
  selectedFocalLength: string;
  open: boolean;
  emptyMessage: string;
  onToggle: () => void;
  onSelect: (profile: CalibrationProfile) => void;
};

export function ProfileDropdown({
  palette,
  profiles,
  selectedProfile,
  selectedFocalLength,
  open,
  emptyMessage,
  onToggle,
  onSelect,
}: Props) {
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={onToggle}
        style={{
          borderWidth: 1,
          borderColor: selectedProfile ? palette.greenText : palette.border,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 14,
          backgroundColor: selectedProfile ? palette.greenSoft : palette.surfaceStrong,
          gap: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>
              {selectedProfile ? selectedProfile.name : "No preset selected"}
            </Text>
            <Text style={{ color: palette.muted, fontSize: 12 }}>
              {selectedProfile ? `${selectedProfile.focalLengthPixels} px` : emptyMessage}
            </Text>
          </View>
          <Text style={{ color: palette.muted, fontWeight: "700" }}>
            {open ? "Hide" : "Choose"}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 16,
            backgroundColor: palette.surfaceStrong,
            overflow: "hidden",
          }}
        >
          {profiles.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ color: palette.muted }}>
                No saved profiles yet. Create one on the calibration page first.
              </Text>
            </View>
          ) : (
            profiles.map((profile, index) => (
              <Pressable
                key={profile.id}
                onPress={() => onSelect(profile)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  backgroundColor:
                    String(profile.focalLengthPixels) === selectedFocalLength
                      ? palette.greenSoft
                      : palette.surfaceStrong,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: palette.border,
                }}
              >
                <Text style={{ color: palette.text, fontWeight: "700" }}>
                  {profile.name}
                </Text>
                <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>
                  {profile.focalLengthPixels} px
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
