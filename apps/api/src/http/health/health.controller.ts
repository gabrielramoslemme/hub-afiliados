import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@Http/shared/decorators/public.decorator';

@ApiTags('health')
// A monitoração bate aqui o tempo todo, e um 429 viraria alarme falso.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOkResponse({ description: 'Aplicação no ar' })
  check(): { status: string; uptime: number } {
    return { status: 'ok', uptime: Math.floor(process.uptime()) };
  }
}
