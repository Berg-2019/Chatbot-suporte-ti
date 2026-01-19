/**
 * Printer Controller - API de monitoramento de impressoras
 */

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrinterService } from './printer.service';

@Controller('printers')
@UseGuards(AuthGuard('jwt'))
export class PrinterController {
    constructor(private printerService: PrinterService) { }

    @Get()
    async findAll() {
        return this.printerService.findAll();
    }

    @Get('status/all')
    async getAllStatus() {
        return this.printerService.getAllStatus();
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.printerService.findById(id);
    }

    @Get(':id/status')
    async getStatus(@Param('id') id: string) {
        return this.printerService.getStatus(id);
    }

    @Post()
    async create(
        @Body() dto: { name: string; ip: string; community?: string; location?: string }
    ) {
        return this.printerService.create(dto);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: { name?: string; ip?: string; community?: string; location?: string; active?: boolean }
    ) {
        return this.printerService.update(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.printerService.delete(id);
    }
}
