/**
 * Printer Service - Monitoramento de impressoras via SNMP
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const snmp = require('net-snmp');

// OIDs SNMP comuns para impressoras
const OIDS = {
  sysName: '1.3.6.1.2.1.1.5.0',           // Nome do sistema
  sysDescr: '1.3.6.1.2.1.1.1.0',          // Descrição/Modelo
  printerStatus: '1.3.6.1.2.1.25.3.5.1.1.1', // Status da impressora

  // SNMPv2-MIB para contador de páginas
  prtMarkerLifeCount: '1.3.6.1.2.1.43.10.2.1.4.1.1',  // Contador de páginas

  // Níveis de toner (pode variar por fabricante)
  tonerMaxBlack: '1.3.6.1.2.1.43.11.1.1.8.1.1',
  tonerCurrentBlack: '1.3.6.1.2.1.43.11.1.1.9.1.1',
  tonerMaxCyan: '1.3.6.1.2.1.43.11.1.1.8.1.2',
  tonerCurrentCyan: '1.3.6.1.2.1.43.11.1.1.9.1.2',
  tonerMaxMagenta: '1.3.6.1.2.1.43.11.1.1.8.1.3',
  tonerCurrentMagenta: '1.3.6.1.2.1.43.11.1.1.9.1.3',
  tonerMaxYellow: '1.3.6.1.2.1.43.11.1.1.8.1.4',
  tonerCurrentYellow: '1.3.6.1.2.1.43.11.1.1.9.1.4',
};

export interface PrinterStatus {
  online: boolean;
  status: string;
  model?: string;
  tonerBlack?: number;
  tonerCyan?: number;
  tonerMagenta?: number;
  tonerYellow?: number;
  pageCount?: number;
  error?: string;
}

@Injectable()
export class PrinterService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.printer.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.printer.findUnique({
      where: { id },
    });
  }

  async create(data: { name: string; ip: string; community?: string; location?: string }) {
    return this.prisma.printer.create({
      data: {
        name: data.name,
        ip: data.ip,
        community: data.community || 'public',
        location: data.location,
      },
    });
  }

  async update(id: string, data: { name?: string; ip?: string; community?: string; location?: string; active?: boolean }) {
    return this.prisma.printer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.prisma.printer.delete({
      where: { id },
    });
    return { message: 'Impressora removida' };
  }

  /**
   * Consultar status de uma impressora via SNMP
   */
  async getStatus(id: string): Promise<PrinterStatus> {
    const printer = await this.prisma.printer.findUnique({
      where: { id },
    });

    if (!printer) {
      return { online: false, status: 'not_found', error: 'Impressora não encontrada' };
    }

    try {
      const status = await this.querySnmp(printer.ip, printer.community);

      // Atualizar cache no banco
      await this.prisma.printer.update({
        where: { id },
        data: {
          lastStatus: status.online ? 'online' : 'offline',
          lastTonerBlack: status.tonerBlack,
          lastTonerCyan: status.tonerCyan,
          lastTonerMagenta: status.tonerMagenta,
          lastTonerYellow: status.tonerYellow,
          lastPageCount: status.pageCount,
          model: status.model || printer.model,
          lastCheckedAt: new Date(),
        },
      });

      return status;
    } catch (error: any) {
      console.error(`❌ Erro SNMP ${printer.ip}:`, error.message);

      await this.prisma.printer.update({
        where: { id },
        data: {
          lastStatus: 'offline',
          lastCheckedAt: new Date(),
        },
      });

      return { online: false, status: 'offline', error: error.message };
    }
  }

  /**
   * Consultar todas as impressoras
   */
  async getAllStatus(): Promise<Array<{ id: string; name: string; ip: string; status: PrinterStatus }>> {
    const printers = await this.prisma.printer.findMany({
      where: { active: true },
    });

    const results = await Promise.all(
      printers.map(async (printer) => ({
        id: printer.id,
        name: printer.name,
        ip: printer.ip,
        location: printer.location,
        status: await this.getStatus(printer.id),
      }))
    );

    return results;
  }

  /**
   * Consulta SNMP real
   */
  private querySnmp(ip: string, community: string): Promise<PrinterStatus> {
    return new Promise((resolve, reject) => {
      const session = snmp.createSession(ip, community, {
        timeout: 5000,
        retries: 1,
      });

      const oidsToQuery = [
        OIDS.sysDescr,
        OIDS.tonerCurrentBlack,
        OIDS.tonerMaxBlack,
        OIDS.prtMarkerLifeCount,
      ];

      session.get(oidsToQuery, (error: any, varbinds: any) => {
        session.close();

        if (error) {
          reject(error);
          return;
        }

        let model = '';
        let tonerBlack: number | undefined;
        let pageCount: number | undefined;

        for (const vb of varbinds) {
          if (snmp.isVarbindError(vb)) continue;

          const oid = vb.oid;
          const value = vb.value;

          if (oid === OIDS.sysDescr) {
            model = value?.toString() || '';
          } else if (oid === OIDS.tonerCurrentBlack) {
            const current = parseInt(value?.toString() || '0');
            tonerBlack = current; // Será calculado como porcentagem
          } else if (oid === OIDS.prtMarkerLifeCount) {
            pageCount = parseInt(value?.toString() || '0');
          }
        }

        resolve({
          online: true,
          status: 'online',
          model: model.substring(0, 100),
          tonerBlack,
          pageCount,
        });
      });
    });
  }
}
