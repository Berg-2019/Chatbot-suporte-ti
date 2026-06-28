import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req,
  UseInterceptors, UploadedFile, BadRequestException, Res, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { existsSync, statSync, createReadStream } from 'fs';
import { ChatService } from './chat.service';
import { SendMessageDto } from './chat.dto';
import { resolveOutgoingMediaPath } from '../../../common/upload/media-path.util';

@Controller('chat')
export class ChatController {
    private readonly logger = new Logger(ChatController.name);

    constructor(
        private service: ChatService,
    ) { }

    @Get('conversations')
    @UseGuards(AuthGuard('jwt'))
    async getConversations(@Req() req: any, @Query('sector') sector?: string) {
        // Sector vem do JWT (isolamento multi-tenant). Apenas ADMIN global pode
        // filtrar outro setor via query; demais ficam travados no próprio setor.
        const isGlobalAdmin = req.user?.role === 'ADMIN';
        const userSector = isGlobalAdmin ? (sector || req.user.sector) : req.user.sector;
        return this.service.getConversations(userSector);
    }

    @Get('messages/:ticketId')
    @UseGuards(AuthGuard('jwt'))
    async getMessages(@Param('ticketId') ticketId: string, @Req() req: any) {
        return this.service.getMessages(ticketId, req.user.id);
    }

    @Post('messages/:ticketId')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file'))
    async sendMessage(
        @Param('ticketId') ticketId: string,
        @Body() dto: SendMessageDto,
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
    @UseGuards(AuthGuard('jwt'))
    async markAsRead(@Param('messageId') messageId: string, @Req() req: any) {
        return this.service.markAsRead(messageId, req.user.id);
    }

    @Get('media/:messageId')
    @UseGuards(AuthGuard('jwt'))
    async getMedia(@Param('messageId') messageId: string, @Req() req: any, @Res() res: Response) {
        const message = await this.service.getMessageWithTicket(messageId);

        if (!message) {
            throw new NotFoundException('Mensagem não encontrada');
        }

        if (message.ticket.sector !== req.user.sector) {
            throw new ForbiddenException('Sem acesso a este setor');
        }

        if (!message.mediaUrl) {
            throw new NotFoundException('Esta mensagem não tem mídia');
        }

        const filePath = resolveOutgoingMediaPath(message.mediaUrl);
        if (!filePath || !existsSync(filePath)) {
            throw new NotFoundException('Arquivo não encontrado');
        }

        this.streamFile(filePath, message.fileName, res);
    }

    private streamFile(filePath: string, fileName: string | null, res: Response) {
        const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
        const mimeMap: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
            mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
            mp3: 'audio/mpeg', ogg: 'audio/ogg',
            pdf: 'application/pdf',
        };

        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
        res.setHeader('Content-Length', String(statSync(filePath).size));
        if (fileName) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        }
        res.setHeader('Cache-Control', 'private, max-age=300');
        createReadStream(filePath).pipe(res);
    }

    private detectKindFromMime(mime: string): 'image' | 'video' | 'audio' | 'file' {
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'video';
        if (mime.startsWith('audio/')) return 'audio';
        return 'file';
    }
}
