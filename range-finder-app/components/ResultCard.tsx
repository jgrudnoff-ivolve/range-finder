import React from "react";
import { View, Text } from "react-native";

type Props = {
  title: string;
  content: unknown;
};

export function ResultCard({ title, content }: Props) {
  const formattedContent =
    typeof content === "string"
      ? content
      : JSON.stringify(content, null, 2) ?? String(content);

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e5e5",
      }}
    >
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>{title}</Text>
      <Text
        selectable
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: "#222",
        }}
      >
        {formattedContent}
      </Text>
    </View>
  );
}
