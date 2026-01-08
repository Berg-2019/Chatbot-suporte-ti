const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const database = require('../db/database');
const { botLogger } = require('./logger');
const { sendAdminNotification, emailTemplates } = require('../config/email');

class BackupManager {
  constructor() {
    this.backupDir = config.system.backupPath;
    this.dbPath = config.database.path;
    this.ensureBackupDirectory();
    
    // Iniciar backup automático se habilitado
    if (config.system.enableAutoBackup) {
      this.startAutoBackup();
    }
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Diretório de backup criado: ${this.backupDir}`);
    }
  }

  async createBackup(type = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${type}_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupName);

      // Verificar se o arquivo do banco existe
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('Arquivo do banco de dados não encontrado');
      }

      // Copiar arquivo do banco
      fs.copyFileSync(this.dbPath, backupPath);

      // Obter informações do arquivo
      const stats = fs.statSync(backupPath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      // Registrar backup no banco de dados
      const backupData = {
        backup_name: backupName,
        backup_path: backupPath,
        backup_size: fileSizeInBytes,
        backup_type: type,
        status: 'completed'
      };

      await database.criarRegistroBackup(backupData);

      console.log(`✅ Backup criado: ${backupName} (${fileSizeInMB} MB)`);
      botLogger.backup(backupName, fileSizeInMB, type);

      // Limpar backups antigos
      await this.cleanupOldBackups();

      // Enviar notificação por e-mail
      if (config.email.adminEmails.length > 0) {
        try {
          const emailData = emailTemplates.backupCreated({
            backupName: backupName,
            size: fileSizeInMB,
            type: type
          });
          await sendAdminNotification(emailData.subject, emailData.text, emailData.html);
        } catch (emailError) {
          console.error('Erro ao enviar notificação de backup por e-mail:', emailError.message);
        }
      }

      return {
        success: true,
        backupName,
        backupPath,
        size: fileSizeInMB
      };

    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      botLogger.botError(error, 'BACKUP_CREATE');
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanupOldBackups() {
    try {
      const maxBackups = 10; // Manter apenas os 10 backups mais recentes
      const backups = await database.listarBackups();

      if (backups.length > maxBackups) {
        const backupsToDelete = backups.slice(maxBackups);
        
        for (const backup of backupsToDelete) {
          try {
            // Remover arquivo físico
            if (fs.existsSync(backup.backup_path)) {
              fs.unlinkSync(backup.backup_path);
            }
            
            // Remover registro do banco (implementar se necessário)
            console.log(`🗑️ Backup antigo removido: ${backup.backup_name}`);
          } catch (error) {
            console.error(`Erro ao remover backup ${backup.backup_name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erro na limpeza de backups:', error);
    }
  }

  startAutoBackup() {
    const intervalHours = config.system.backupInterval;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    console.log(`🔄 Backup automático configurado para cada ${intervalHours} horas`);

    setInterval(async () => {
      console.log('🔄 Iniciando backup automático...');
      const result = await this.createBackup('auto');
      
      if (result.success) {
        console.log(`✅ Backup automático concluído: ${result.backupName}`);
      } else {
        console.error(`❌ Falha no backup automático: ${result.error}`);
      }
    }, intervalMs);

    // Criar backup inicial
    setTimeout(async () => {
      console.log('🔄 Criando backup inicial...');
      await this.createBackup('initial');
    }, 30000); // 30 segundos após inicialização
  }

  async exportOSToFile(osId) {
    try {
      const exportDir = config.system.exportPath;
      
      // Criar diretório de exportação se não existir
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Buscar dados da OS
      const os = await database.buscarOS(osId);
      if (!os) {
        throw new Error(`OS #${osId} não encontrada`);
      }

      // Buscar histórico da OS
      const historico = await database.buscarHistoricoOS(osId);

      // Buscar solicitações de peças relacionadas
      const pecas = await database.listarSolicitacoesPorOS(osId);

      // Criar objeto com todos os dados
      const exportData = {
        os: os,
        historico: historico,
        pecas: pecas,
        exportedAt: new Date().toISOString(),
        exportedBy: 'system'
      };

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `OS_${osId}_${timestamp}.json`;
      const filePath = path.join(exportDir, fileName);

      // Salvar arquivo
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');

      const stats = fs.statSync(filePath);
      const fileSizeInKB = (stats.size / 1024).toFixed(2);

      console.log(`📄 OS #${osId} exportada: ${fileName} (${fileSizeInKB} KB)`);

      return {
        success: true,
        fileName,
        filePath,
        size: fileSizeInKB
      };

    } catch (error) {
      console.error(`Erro ao exportar OS #${osId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBackupStats() {
    try {
      const backups = await database.listarBackups();
      const totalSize = backups.reduce((sum, backup) => sum + (backup.backup_size || 0), 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

      return {
        totalBackups: backups.length,
        totalSize: totalSizeMB,
        lastBackup: backups.length > 0 ? backups[0].created_at : null,
        backups: backups.slice(0, 5) // Últimos 5 backups
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de backup:', error);
      return {
        totalBackups: 0,
        totalSize: '0',
        lastBackup: null,
        backups: []
      };
    }
  }

  async restoreFromBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error('Arquivo de backup não encontrado');
      }

      // Criar backup do estado atual antes de restaurar
      await this.createBackup('pre_restore');

      // Fechar conexão atual do banco
      await database.close();

      // Substituir arquivo do banco
      fs.copyFileSync(backupPath, this.dbPath);

      console.log(`✅ Banco restaurado a partir de: ${path.basename(backupPath)}`);
      
      // Reinicializar conexão do banco seria necessário aqui
      // (isso requereria reiniciar o bot)

      return {
        success: true,
        message: 'Backup restaurado com sucesso. Reinicie o bot para aplicar as mudanças.'
      };

    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new BackupManager();
