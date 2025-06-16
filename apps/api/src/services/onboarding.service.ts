import { SyncStrategy } from '@crate/shared';
import { EmailSyncService } from './email-sync.service';
import { UserService } from './user.service';

export class OnboardingService {
  static async onboardNewUser(userId: string) {
    try {
      const user = await UserService.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await EmailSyncService.initiateSync(userId, SyncStrategy.QUICK);

      setTimeout(async () => {
        try {
          await EmailSyncService.initiateSync(userId, SyncStrategy.FULL);
        } catch (error: any) {
          console.error('Failed to start full sync for user:', userId, error);
        }
      }, 5000);

      return {
        message: 'Welcome! Your recent emails are loading, full import will begin shortly.',
        quickSyncStarted: true,
        fullSyncScheduled: true,
      };
    } catch (error: any) {
      console.error('Onboarding failed for user:', userId, error);
      throw error;
    }
  }
}