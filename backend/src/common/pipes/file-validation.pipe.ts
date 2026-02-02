import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private options: FileValidationOptions = {}) {
    // Default values
    this.options.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.options.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
    ];
    this.options.allowedExtensions = options.allowedExtensions || [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.mp4',
      '.webm',
      '.mp3',
      '.ogg',
      '.wav',
    ];
  }

  transform(file: UploadedFile, metadata: ArgumentMetadata) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    // Validate file size
    if (file.size > this.options.maxSize!) {
      const maxSizeMB = (this.options.maxSize! / 1024 / 1024).toFixed(2);
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
      );
    }

    // Validate MIME type
    if (!this.options.allowedMimeTypes!.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos aceitos: ${this.options.allowedMimeTypes!.join(', ')}`,
      );
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.options.allowedExtensions!.includes(ext)) {
      throw new BadRequestException(
        `Extensão de arquivo não permitida. Extensões aceitas: ${this.options.allowedExtensions!.join(', ')}`,
      );
    }

    // Check for path traversal attempts
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      throw new BadRequestException('Nome de arquivo inválido');
    }

    // Check for null bytes (potential security issue)
    if (file.originalname.includes('\0')) {
      throw new BadRequestException('Nome de arquivo contém caracteres inválidos');
    }

    return file;
  }
}

/**
 * Predefined validators for common file types
 */
export const ImageFileValidation = new FileValidationPipe({
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
});

export const VideoFileValidation = new FileValidationPipe({
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  allowedExtensions: ['.mp4', '.webm', '.mov'],
});

export const AudioFileValidation = new FileValidationPipe({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  allowedExtensions: ['.mp3', '.ogg', '.wav', '.webm'],
});

export const DocumentFileValidation = new FileValidationPipe({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  allowedExtensions: ['.pdf', '.doc', '.docx'],
});
