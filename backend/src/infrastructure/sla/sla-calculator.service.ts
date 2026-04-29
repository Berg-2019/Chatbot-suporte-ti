import { Injectable, Logger } from '@nestjs/common';
import { Priority, Sector } from '@prisma/client';

export interface SlaDeadline {
  responseDueAt: Date;
  resolutionDueAt: Date;
}

@Injectable()
export class SlaCalculatorService {
  private readonly logger = new Logger(SlaCalculatorService.name);

  private readonly defaultSchedules: Record<string, { start: string; end: string }> = {
    mon: { start: '08:00', end: '18:00' },
    tue: { start: '08:00', end: '18:00' },
    wed: { start: '08:00', end: '18:00' },
    thu: { start: '08:00', end: '18:00' },
    fri: { start: '08:00', end: '18:00' },
    sat: { start: '00:00', end: '00:00' },
    sun: { start: '00:00', end: '00:00' },
  };

  calculateDeadlines(
    responseTimeMins: number,
    resolutionTimeMins: number,
    startTime: Date = new Date(),
    schedule?: any,
    timezone: string = 'America/Sao_Paulo',
  ): SlaDeadline {
    const effectiveSchedule = schedule || this.defaultSchedules;
    const responseDueAt = this.addBusinessMinutes(startTime, responseTimeMins, effectiveSchedule, timezone);
    const resolutionDueAt = this.addBusinessMinutes(startTime, resolutionTimeMins, effectiveSchedule, timezone);
    return { responseDueAt, resolutionDueAt };
  }

  private addBusinessMinutes(start: Date, mins: number, schedule: any, tz: string): Date {
    const WORK_MINUTES_PER_DAY = 480;
    let remaining = mins;
    let current = new Date(start);

    while (remaining > 0) {
      const dayKey = this.getDayKey(current);
      const daySchedule = schedule[dayKey] || { start: '08:00', end: '18:00' };

      const [dayStartH, dayStartM] = daySchedule.start.split(':').map(Number);
      const [dayEndH, dayEndM] = daySchedule.end.split(':').map(Number);
      const dayStart = new Date(current);
      dayStart.setHours(dayStartH, dayStartM, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(dayEndH, dayEndM, 0, 0);

      if (dayEnd.getTime() <= dayStart.getTime()) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      if (current < dayStart) current = new Date(dayStart);
      if (current >= dayEnd) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      const availableToday = Math.floor((dayEnd.getTime() - current.getTime()) / 60000);
      if (availableToday <= 0) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      if (remaining <= availableToday) {
        current = new Date(current.getTime() + remaining * 60000);
        remaining = 0;
      } else {
        remaining -= availableToday;
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
    }

    return current;
  }

  private getDayKey(date: Date): string {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  }

  isWithinBusinessHours(date: Date, schedule?: any): boolean {
    const effectiveSchedule = schedule || this.defaultSchedules;
    const dayKey = this.getDayKey(date);
    const daySchedule = effectiveSchedule[dayKey];
    if (!daySchedule) return false;

    const [startH, startM] = daySchedule.start.split(':').map(Number);
    const [endH, endM] = daySchedule.end.split(':').map(Number);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeMins = hours * 60 + minutes;
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    return timeMins >= startMins && timeMins < endMins;
  }

  getNextBusinessHour(date: Date, schedule?: any): Date {
    const effectiveSchedule = schedule || this.defaultSchedules;
    const dayKey = this.getDayKey(date);
    const daySchedule = effectiveSchedule[dayKey];
    if (!daySchedule) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      next.setHours(8, 0, 0, 0);
      return next;
    }

    const [startH, startM] = daySchedule.start.split(':').map(Number);
    const currentMins = date.getHours() * 60 + date.getMinutes();
    const startMins = startH * 60 + startM;

    if (currentMins < startMins) {
      const next = new Date(date);
      next.setHours(startH, startM, 0, 0);
      return next;
    }

    const [endH, endM] = daySchedule.end.split(':').map(Number);
    const endMins = endH * 60 + endM;
    if (currentMins >= endMins) {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      next.setHours(startH, startM, 0, 0);
      return next;
    }

    return new Date(date);
  }

  calculateBreachStatus(timer: {
    responseDueAt: Date;
    resolutionDueAt: Date;
    responseMetAt?: Date | null;
    resolutionMetAt?: Date | null;
    responseBreached: boolean;
    resolutionBreached: boolean;
    pausedAt?: Date | null;
  }) {
    const now = new Date();
    const responseBreached = !timer.responseMetAt && now > timer.responseDueAt;
    const resolutionBreached = !timer.resolutionMetAt && now > timer.resolutionDueAt;
    return { responseBreached, resolutionBreached };
  }
}