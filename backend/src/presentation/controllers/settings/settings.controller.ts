import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, UserRole } from '../../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { CreateSettingDto, UpdateSettingDto, BulkUpdateSettingsDto } from './settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /**
   * Get all settings (or by category)
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findAll(@Query('category') category?: string) {
    return this.settingsService.findAll(category);
  }

  /**
   * Get all settings as key-value object
   */
  @Get('object')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async getAsObject(@Query('category') category?: string) {
    return this.settingsService.getAsObject(category);
  }

  /**
   * Get a specific setting by key
   */
  @Get(':key')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  /**
   * Create or update a setting (upsert)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async upsert(@Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.upsert(createSettingDto);
  }

  /**
   * Update an existing setting
   */
  @Put(':key')
  @Roles(UserRole.ADMIN)
  async update(@Param('key') key: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.update(key, updateSettingDto);
  }

  /**
   * Delete a setting
   */
  @Delete(':key')
  @Roles(UserRole.ADMIN)
  async remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }

  /**
   * Bulk update settings
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN)
  async bulkUpdate(@Body() bulkUpdateDto: BulkUpdateSettingsDto) {
    return this.settingsService.bulkUpdate(bulkUpdateDto.settings || {});
  }

  /**
   * Initialize default settings
   */
  @Post('initialize')
  @Roles(UserRole.ADMIN)
  async initializeDefaults() {
    return this.settingsService.initializeDefaults();
  }
}
