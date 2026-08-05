import { Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncOrchestrator } from './sync-orchestrator.service';

@Controller('sync')
export class SyncOrchestratorController {
  constructor(
    private readonly orchestrator: SyncOrchestrator,
    private readonly prisma: PrismaService,
  ) {}

  @Get('runs')
  listRuns() {
    return this.prisma.syncRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        bot: {
          select: {
            id: true,
            username: true,
            displayName: true,
            sourceType: true,
          },
        },
      },
    });
  }

  @Post('run')
  async runNow() {
    const result = await this.orchestrator.runAll('manual');
    return { ok: true, result };
  }
}
