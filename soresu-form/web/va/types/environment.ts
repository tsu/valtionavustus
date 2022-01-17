type FeatureFlag = { "enabled?": boolean }
export type FeatureFlagKey = keyof Omit<EnvironmentApiResponse, 'name' | 'hakija-server'>

export interface EnvironmentApiResponse {
  name: string
  "hakija-server": {
    url: {
      fi: string,
      sv: string
    }
  }
  "va-code-values": FeatureFlag
  reports: FeatureFlag
  "allow-overriding-feature-flag-from-url-params"?: FeatureFlag
  "dont-send-loppuselvityspyynto-to-virkailija"?: FeatureFlag
}
