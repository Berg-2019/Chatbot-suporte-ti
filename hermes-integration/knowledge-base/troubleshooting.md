# Troubleshooting - Problemas Comuns e Soluções

## Problemas de Hardware

### Notebook não liga
```
Sintomas: Pressiona power e nada acontece
Soluções:
1. Conecte carregador diretamente (tire a bateria se possível)
2. Aguarde 30 segundos com carregador conectado
3. Tente com outro carregador (emprestado)
4. Se ainda nada, problema na fonte ou placa
```
**Ação:** Abrir chamado como "URGENTE" se trabalho bloqueado.

---

### Teclado não funciona
```
Sintomas: Algumas teclas ou tudo não respondem
Soluções:
1. Reinicie o notebook
2. Limpe embaixo das teclas (ar comprimido)
3. Conecte teclado USB externo para testar
4. Verifique se há líquido derramado
```
**Ação:** Se externo USB funcionar e interno não, hardware interno com problema.

---

### Monitor sem imagem
```
Sintomas: Tela preta ou "sem sinal"
Soluções:
1. Verifique cabos (desconecte e reconecte)
2. Tente outro cabo ou porta
3. Teste em outro computador
4. Aumente brilho da tela (Fn + brilho)
5. Tente Ctrl+Win+Shift+B (reiniciar placa video)
```
**Ação:** Se problema for em notebook, testar com monitor externo.

---

## Problemas de Software

### Computador muito lento
```
Causas comuns:
- Muita abas do navegador abertas
- Programas em segundo plano
- Disco cheio
- Vírus/malware
- Pouca memória RAM

Soluções rápidas:
1. Reiniciar PC
2. Ctrl+Shift+Esc → Encerrar processos pesados
3. Limpeza de disco (C: → Properties → Disk Cleanup)
4. Verificar malware (Windows Defender offline)
5. Desligar e leave 10 min se superaquecendo
```
**Ação:** Persistindo há mais de 1 dia, abrir chamado.

---

### Programa não abre
```
Soluções:
1. Tentar executar como administrador (botão direito)
2. Verificar compatibilidade (botão direito → Properties → Compatibility)
3. Reinstalar programa
4. Verificar requisitos do sistema
```
**Ação:** Se programa essencial e reinstall não resolver, abrir chamado.

---

### Tela azul (BSOD)
```
Sintomas: Tela azul com erro
Soluções:
1. Anote o código do erro (ex: CRITICAL_PROCESS_DIED)
2. Reinicie
3. Se repetir, anote hora e contexto
```
**Ação:** Abrir chamado ANEXANDO foto da tela azul.

---

## Problemas de Rede

### Sem internet
```
Diagnóstico:
1. outros dispositivos受影响?
2. Cabo de rede conectado?
3. Wi-Fi conectado à rede errada?

Soluções:
1. Desligar e ligar roteador
2. Esquecer e reconectar Wi-Fi
3. IP automático:netsh winsock reset
4. DNS: ipconfig /flushdns
```
**Ação:** Se só seu PC, chamar TI. Se todos,可能就是rede.

---

### VPN não conecta
```
Soluções:
1. Verificar credenciais (senha expirou?)
2. Verificar se licença VPN ativa
3. Tentar outra porta (443 vs 1194)
4. Reinstalar cliente VPN
5. Desativar firewall temporariamente
```
**Ação:** Se problemaapós reinstall, chamar TI.

---

## Problemas de Email/Comunicacao

### Email não envia
```
Soluções:
1. Verificar destinatário
2. Anexos muito grandes? (>25MB)
3. Caixa de saída lotada? (limite 2GB)
4. Credenciais corretas?
5. Reiniciar Outlook
```
**Ação:** Persistindo, clique em "Configurar Outlook" via panel.

---

### Teams/Zoom não funciona
```
Soluções:
1. Verificar câmera/microfone permitidos
2. Limpar cache app (Settings → Apps → Zoom)
3. Atualizar app
4. Reiniciar PC
5. Testar em outro dispositivo
```
**Ação:** Se todos os apps de video falham, possível problema de rede.

---

## Problemas de Impressao

### Impressora não imprime
```
Diagnóstico:
1. LED de status da impressora?
2. Papel放置正确?
3. Toner/suprimentos OK?

Soluções:
1. Cancelar trabalhos pendentes (spooler restart)
2. Reiniciar impressora
3. Remover e recriar fila de impressão
4. Executar troubleshooter Windows
```
**Ação:** Se impressora departamental, verificar sinalização para modelo específico.

---

### Scanner não funciona
```
Soluções:
1. Verificar conexão de rede
2. Colocar documento corretamente no vidro
3. Limpar vidro do scanner
4. Tentarsoftware nativo do scanner
5. Reiniciar scanner
```
**Ação:** Falha em digitalizar, chamar TI com modelo e patrimonio.
