import { logger } from '../utils/logger';

export class ProcessRegistry {
  private activeTasks = new Set<string>();

  registerTask(subtitleId: string) {
    logger.info(`Registering task ${subtitleId}`);
    this.activeTasks.add(subtitleId);
  }

  deregisterTask(subtitleId: string) {
    logger.info(`Deregistering task ${subtitleId}`);
    this.activeTasks.delete(subtitleId);
  }

  isTaskActive(subtitleId: string): boolean {
    return this.activeTasks.has(subtitleId);
  }

  getActiveCount(): number {
    return this.activeTasks.size;
  }
}
