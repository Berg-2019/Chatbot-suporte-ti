import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { SectorGuard } from '../../../common/guards/sector.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'), SectorGuard)
export class ChatController {
    constructor(private service: ChatService) { }

    @Get('conversations')
    async getConversations(@Req() req: any, @Query('sector') sector?: string) {
        const userSector = sector || req.user.sector || 'TI';
        return this.service.getConversations(userSector);
    }

    @Get('messages/:ticketId')
    async getMessages(@Param('ticketId') ticketId: string, @Req() req: any) {
        return this.service.getMessages(ticketId, req.user.id);
    }

    @Post('messages/:ticketId')
    @UseInterceptors(FileInterceptor('file'))
    async sendMessage(
        @Param('ticketId') ticketId: string,
        @Body() dto: {
          content?: string;
          kind?: 'text' | 'image' | 'video' | 'audio' | 'file';
          isInternal?: 'true' | 'false';
          duration?: string;
        },
        @UploadedFile() file: Express.Multer.File | undefined,
        @Req() req: any,
    ) {
        const kind = dto.kind ?? (file ? this.detectKindFromMime(file.mimetype) : 'text');

        if (kind === 'text' && !dto.content?.trim()) {
            throw new BadRequestException('Mensagem de texto vazia');
        }
        if (kind !== 'text' && !file) {
            throw new BadRequestException(`Mensagem ${kind} requer arquivo`);
        }

        return this.service.sendMessage({
            ticketId,
            content: dto.content ?? '',
            kind,
            file,
            duration: dto.duration ? parseInt(dto.duration, 10) : undefined,
            isInternal: dto.isInternal === 'true',
            senderId: req.user.id,
            senderType: 'technician',
        });
    }

    @Post('messages/:messageId/read')
    async markAsRead(@Param('messageId') messageId: string, @Req() req: any) {
        return this.service.markAsRead(messageId, req.user.id);
    }

    @Patch('messages/:id/wa-id')
    async setWaId(@Param('id') id: string, @Body('waMessageId') waMessageId: string) {
        return this.service.setWaMessageId(id, waMessageId);
    }

    private detectKindFromMime(mime: string): 'image' | 'video' | 'audio' | 'file' {
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        if (mime.startsWith('audio/')) return 'audio';
        return 'file';
    }
}