import { MeetingCaptureProvider } from './types';
import { recallProvider } from './recall.provider';
import { ownProvider } from './own.provider';

export * from './types';
export { recallProvider, ownProvider };

export function getCaptureProvider(): MeetingCaptureProvider {
  const providerName = (process.env.CAPTURE_PROVIDER || 'recall').toLowerCase().trim();

  if (providerName === 'own' || providerName === 'custom' || providerName === 'playwright') {
    return ownProvider;
  }

  return recallProvider;
}
