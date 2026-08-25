import { Injectable } from '@nestjs/common';
import { Clock } from '@Domain/shared/clock';

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
