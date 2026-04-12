import React from "react";
import { Text, View } from "react-native";

import {
  CalibrationResponse,
  EstimateResponse,
  GolfEstimateResponse,
} from "../types";

type ResultState =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "error"; message: string }
  | {
      kind: "calibration";
      data: CalibrationResponse;
      profileName: string;
    }
  | { kind: "estimate"; data: EstimateResponse }
  | { kind: "golf"; data: GolfEstimateResponse };

type Props = {
  result: ResultState;
};

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        borderRadius: 16,
        padding: 14,
        backgroundColor: tone === "accent" ? "#f0d1bd" : "#ffffff",
        borderWidth: 1,
        borderColor: tone === "accent" ? "#dfb49a" : "#e8dfd0",
      }}
    >
      <Text style={{ color: "#6f665b", fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
      <Text
        style={{
          marginTop: 6,
          color: "#1f1a14",
          fontSize: 22,
          fontWeight: "800",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function ResultSummary({ result }: Props) {
  if (result.kind === "idle") {
    return (
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "#d8cfbf",
          padding: 16,
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ color: "#6f665b" }}>
          No calculation yet. Run an estimate or calibration to see the result here.
        </Text>
      </View>
    );
  }

  if (result.kind === "loading") {
    return (
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#d8cfbf",
          padding: 16,
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ color: "#1f1a14", fontWeight: "700" }}>
          Working on it...
        </Text>
        <Text style={{ color: "#6f665b", marginTop: 6 }}>{result.message}</Text>
      </View>
    );
  }

  if (result.kind === "error") {
    return (
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#e6b8a5",
          padding: 16,
          backgroundColor: "#fff5f0",
        }}
      >
        <Text style={{ color: "#8f4021", fontWeight: "800" }}>
          Something went wrong
        </Text>
        <Text style={{ color: "#6f665b", marginTop: 6 }}>{result.message}</Text>
      </View>
    );
  }

  if (result.kind === "calibration") {
    return (
      <View style={{ gap: 12 }}>
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#d8cfbf",
            padding: 16,
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#8f4021", fontWeight: "800", fontSize: 13 }}>
            Calibration saved
          </Text>
          <Text
            style={{
              color: "#1f1a14",
              fontWeight: "800",
              fontSize: 24,
              marginTop: 4,
            }}
          >
            {result.profileName}
          </Text>
          <Text style={{ color: "#6f665b", marginTop: 6, lineHeight: 20 }}>
            This focal length can now be reused on the estimate screen for the same camera and zoom level.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Stat
            label="Focal length"
            value={`${Math.round(result.data.focal_length_pixels)} px`}
            tone="accent"
          />
        </View>
      </View>
    );
  }

  if (result.kind === "golf") {
    return (
      <View style={{ gap: 12 }}>
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#d8cfbf",
            padding: 16,
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#33523b", fontWeight: "800", fontSize: 13 }}>
            Golf mode estimate
          </Text>
          <Text
            style={{
              color: "#1f1a14",
              fontWeight: "800",
              fontSize: 30,
              marginTop: 4,
            }}
          >
            {result.data.distance_m.toFixed(2)} m
          </Text>
          <Text style={{ color: "#6f665b", marginTop: 6, lineHeight: 20 }}>
            Distance to the golf flag using your manual flag points and an assumed flag height of {result.data.assumed_object_height_cm / 100} m.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Stat label="Distance" value={`${Math.round(result.data.distance_cm)} cm`} tone="accent" />
        </View>

      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "#d8cfbf",
          padding: 16,
          backgroundColor: "#ffffff",
        }}
      >
        <Text style={{ color: "#33523b", fontWeight: "800", fontSize: 13 }}>
          Estimate complete
        </Text>
        <Text
          style={{
            color: "#1f1a14",
            fontWeight: "800",
            fontSize: 30,
            marginTop: 4,
          }}
        >
          {result.data.distance_m.toFixed(2)} m
        </Text>
        <Text style={{ color: "#6f665b", marginTop: 6, lineHeight: 20 }}>
          Approximate distance to the measured object.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Stat label="Distance" value={`${Math.round(result.data.distance_cm)} cm`} tone="accent" />
      </View>

      {result.data.confidence ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#d8cfbf",
            padding: 14,
            backgroundColor: "#ffffff",
          }}
        >
          <Text style={{ color: "#6f665b", fontSize: 12, fontWeight: "700" }}>
            Confidence
          </Text>
          <Text style={{ color: "#1f1a14", marginTop: 6 }}>
            {result.data.confidence}
          </Text>
        </View>
      ) : null}

      {result.data.warnings?.length ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e6d3a5",
            padding: 14,
            backgroundColor: "#fffaf0",
            gap: 8,
          }}
        >
          <Text style={{ color: "#8a6a17", fontSize: 12, fontWeight: "800" }}>
            Notes
          </Text>
          {result.data.warnings.map((warning) => (
            <Text key={warning} style={{ color: "#6f665b", lineHeight: 20 }}>
              - {warning}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
