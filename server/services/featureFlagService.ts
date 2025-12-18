import { storage } from '../storage';

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await storage.getFeatureFlag(key);
  return flag?.enabled ?? false;
}

export async function getFeatureFlagConfig(key: string): Promise<any> {
  const flag = await storage.getFeatureFlag(key);
  return flag?.configJson ?? {};
}

export async function initializeDefaultFlags() {
  const defaults = [
    { key: 'ARCHIVE_OLDER_THAN_YESTERDAY', enabled: false, configJson: {} },
    { key: 'EXTRA_RETRY_PURCHASES', enabled: false, configJson: {} },
  ];

  for (const flag of defaults) {
    const existing = await storage.getFeatureFlag(flag.key);
    if (!existing) {
      await storage.upsertFeatureFlag(flag);
    }
  }
}
