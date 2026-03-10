"use strict";
/**
 * Test MiniMax AI Integration
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
require("dotenv/config");
var MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
function testMiniMax() {
    return __awaiter(this, void 0, void 0, function () {
        var testMessage, prompt, response, content, jsonMatch, parsed, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('🧪 Testando integração com MiniMax AI...\n');
                    if (!MINIMAX_API_KEY) {
                        console.error('❌ MINIMAX_API_KEY não encontrada no .env');
                        process.exit(1);
                    }
                    console.log('✓ API Key encontrada:', MINIMAX_API_KEY.substring(0, 20) + '...');
                    testMessage = 'Minha impressora não está imprimindo';
                    prompt = "Voc\u00EA \u00E9 um classificador de inten\u00E7\u00F5es para helpdesk. Analise a mensagem e retorne JSON com: intent, confidence, entities.\n\nMensagem: \"".concat(testMessage, "\"\n\nResponda APENAS com JSON v\u00E1lido:\n{\n  \"intent\": \"abrir_ticket_ti\",\n  \"confidence\": 0.95,\n  \"entities\": {\n    \"equipamento\": \"impressora\",\n    \"problema\": \"n\u00E3o imprime\"\n  }\n}");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    console.log('\n📤 Enviando requisição para MiniMax...');
                    // Testando diferentes URLs e modelos possíveis
                    console.log('Tentando modelo: abab6-chat');
                    return [4 /*yield*/, axios_1.default.post('https://api.minimaxi.chat/v1/text/chatcompletion', {
                            model: 'abab6-chat',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Você é um classificador de intenções para helpdesk. Responda APENAS com JSON válido.'
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            max_tokens: 200,
                            temperature: 0.1,
                            top_p: 0.9,
                        }, {
                            headers: {
                                'Authorization': "Bearer ".concat(MINIMAX_API_KEY),
                                'Content-Type': 'application/json'
                            },
                            timeout: 15000
                        })];
                case 2:
                    response = _c.sent();
                    console.log('✅ Resposta recebida!\n');
                    console.log('Status:', response.status);
                    console.log('Response data:', JSON.stringify(response.data, null, 2));
                    content = response.data.choices[0].message.content;
                    console.log('\n📥 Conteúdo da resposta:');
                    console.log(content);
                    jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                        console.log('\n✅ JSON parseado com sucesso:');
                        console.log(JSON.stringify(parsed, null, 2));
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    console.error('\n❌ Erro:', error_1.message);
                    if ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) {
                        console.error('Detalhes do erro:', JSON.stringify(error_1.response.data, null, 2));
                    }
                    if ((_b = error_1.response) === null || _b === void 0 ? void 0 : _b.status) {
                        console.error('Status HTTP:', error_1.response.status);
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
testMiniMax();
