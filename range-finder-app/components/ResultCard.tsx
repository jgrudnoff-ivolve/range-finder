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
        backgroundColor: "#fffaf2",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#d8cfbf",
      }}
    >
      <Text style={{ fontWeight: "700", marginBottom: 6, color: "#1f1a14", fontSize: 18 }}>
        {title}
      </Text>
      <Text style={{ color: "#6f665b", fontSize: 13, marginBottom: 12 }}>
        Server response and calculation output.
      </Text>
      <Text
        selectable
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: "#222",
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#e8dfd0",
          borderRadius: 16,
          padding: 12,
        }}
      >
        {formattedContent}
      </Text>
    </View>
  );
}
