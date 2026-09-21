declare module "@package-kr/react-native-naver-signin" {
  export function login(): Promise<string | { accessToken?: string }>;
  export function logout(): Promise<void>;
}

declare module "@xmartlabs/react-native-line" {
  export function setup(params: { channelId: string }): Promise<void>;
  export function login(params?: {
    scopes?: string[];
  }): Promise<{ accessToken?: { accessToken?: string } | string }>;
}
