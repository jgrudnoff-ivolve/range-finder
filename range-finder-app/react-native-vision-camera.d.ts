declare module "react-native-vision-camera" {
  import * as React from "react";
  import { StyleProp, ViewStyle } from "react-native";

  export type CameraPosition = "front" | "back" | "external";
  export type PhysicalCameraDeviceType =
    | "ultra-wide-angle"
    | "wide-angle"
    | "telephoto";

  export type CameraDevice = {
    id: string;
    position: CameraPosition;
    physicalDevices?: Array<{ type?: PhysicalCameraDeviceType }>;
    isVirtualDevice?: boolean;
    minZoom?: number;
    maxZoom?: number;
    zoomLensSwitchFactors?: number[];
  };

  export type PhotoFile = {
    path: string;
    width: number;
    height: number;
  };

  export type CameraRuntimeError = {
    message: string;
  };

  export type UseCameraDeviceOptions = {
    physicalDevices?: PhysicalCameraDeviceType[];
  };

  export function useCameraPermission(): {
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
  };

  export function useCameraDevice(
    position: CameraPosition,
    options?: UseCameraDeviceOptions
  ): CameraDevice | undefined;

  export class Camera extends React.Component<{
    device: CameraDevice;
    isActive: boolean;
    style?: StyleProp<ViewStyle>;
    photo?: boolean;
    zoom?: number;
    enableNativeZoomGesture?: boolean;
    onInitialized?: () => void;
    onError?: (error: CameraRuntimeError) => void;
  }> {
    takePhoto(options?: { enableShutterSound?: boolean }): Promise<PhotoFile>;
  }
}
