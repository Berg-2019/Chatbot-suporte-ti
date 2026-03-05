/**
 * Macros DTOs - Bulk Actions for Tickets
 */

import { IsArray, IsEnum, IsOptional, IsString, IsBoolean, ArrayMinSize } from 'class-validator';

export enum MacroActionType {
    ASSIGN_AGENT = 'assign_agent',
    CHANGE_STATUS = 'change_status',
    CHANGE_PRIORITY = 'change_priority',
    ADD_LABEL = 'add_label',
    REMOVE_LABEL = 'remove_label',
    SEND_MESSAGE = 'send_message',
    CLOSE_TICKET = 'close_ticket',
}

export class ExecuteMacroDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'Deve selecionar pelo menos 1 ticket' })
    ticketIds: string[];

    @IsEnum(MacroActionType)
    action: MacroActionType;

    @IsOptional()
    @IsString()
    value?: string; // AgentID, Status, Priority, LabelName, Message

    @IsOptional()
    @IsBoolean()
    sendNotification?: boolean;
}

export class CreateMacroDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(MacroActionType)
    action: MacroActionType;

    @IsString()
    value: string;

    @IsBoolean()
    @IsOptional()
    sendNotification?: boolean;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateMacroDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(MacroActionType)
    action?: MacroActionType;

    @IsOptional()
    @IsString()
    value?: string;

    @IsOptional()
    @IsBoolean()
    sendNotification?: boolean;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
