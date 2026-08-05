import { Module } from '@nestjs/common';
import { BotsController } from './bots.controller';

@Module({
  controllers: [BotsController],
})
export class BotsModule {}
