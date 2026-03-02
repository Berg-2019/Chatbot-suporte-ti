/**
 * Automation DTOs
 */

import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AutomationEvent {
  TICKET_CREATED = 'ticket_created',
  TICKET_UPDATED = 'ticket_updated',
  TICKET_ASSIGNED = 'ticket_assigned',
  TICKET_RESOLVED = 'ticket_resolved',
  TICKET_CLOSED = 'ticket_closed',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  CSAT_RECEIVED = 'csat_received',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

export enum ActionType {
  ASSIGN_AGENT = 'assign_agent',
  SET_PRIORITY = 'set_priority',
  ADD_LABEL = 'add_label',
  CHANGE_STATUS = 'change_status',
  SEND_MESSAGE = 'send_message',
  SEND_NOTIFICATION = 'send_notification',
  SEND_WEBHOOK = 'send_webhook',
  ESCALATE = 'escalate',
}

export class AutomationConditionDto {
  @IsString()
  field: string;

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  value: any; // Pode ser string, number, array, etc
}

export class AutomationActionDto {
  @IsEnum(ActionType)
  type: ActionType;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  targetUsers?: string[];

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  method?: string;
}

export class CreateAutomationRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AutomationEvent)
  event: AutomationEvent;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionDto)
  conditions: AutomationConditionDto[];

  @IsOptional()
  @IsEnum(['AND', 'OR'])
  conditionOperator?: 'AND' | 'OR';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions: AutomationActionDto[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AutomationEvent)
  event?: AutomationEvent;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationConditionDto)
  conditions?: AutomationConditionDto[];

  @IsOptional()
  @IsEnum(['AND', 'OR'])
  conditionOperator?: 'AND' | 'OR';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationActionDto)
  actions?: AutomationActionDto[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AutomationRuleQueryDto {
  @IsOptional()
  @IsEnum(AutomationEvent)
  event?: AutomationEvent;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
