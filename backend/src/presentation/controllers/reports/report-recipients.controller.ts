import { Controller, Get, Post, Body } from '@nestjs/common';
import { ReportRecipientsService } from './report-recipients.service';

@Controller('reports/recipients')
export class ReportRecipientsController {
    constructor(private service: ReportRecipientsService) { }

    @Post()
    async create(@Body() dto: { name: string; jid: string }) {
        return this.service.create(dto.name, dto.jid);
    }

    @Get()
    async findAll() {
        return this.service.findAll();
    }
}
