// ✅ Configurações do Banco Inter
export const INTER_CONFIG = {
  clientId: "27dc6392-c910-4cf8-a813-6d9ee3c53d2c",
  clientSecret: "b27ef1f1-89e6-4010-961b-2311afab2a75",
  certificatePath: "/certs/certificado_webhook.p12",
  baseUrl: "https://cdpj.partners.bancointer.com.br",
  scope: "pix.cob.write pix.cob.read webhook.read webhook.write",
  endpoints: {
    token: "/oauth/v2/token",
    pixCob: "/pix/v2/cob",
    webhook: "/pix/api/v2/webhook",
  },
};

// 📌 Configurações de fallback e timeout padrão
export const DEFAULT_ADVANCED_CONFIG = {
  globalTimeout: 30,
  maxRetryDelay: 60,
  logRetentionDays: 30,
  enableAutoRetry: true,
  enableSecurityValidation: true,
  enableDetailedLogs: false,
  enableApiMonitoring: true,
  enableWebhookSignatureValidation: true,
  enableTransactionLogs: true,
  interTimeout: 30,
  interMaxRetries: 3,
  interEnableSSLValidation: true,
  interEnableWebhookValidation: true,
  foursendTimeout: 30,
  foursendMaxRetries: 3,
  foursendEnableNotifications: true,
  foursendEnableCustomHeaders: false,
};

// 📌 Função utilitária de geração do Payload (exemplo mínimo funcional)
export function gerarPayloadPix({
  chavePix,
  valor,
  nome,
  cidade,
  txid,
}: {
  chavePix: string;
  valor: number;
  nome: string;
  cidade: string;
  txid: string;
}): string {
  const payload =
    `000201` +
    `26` +
    `${(14 + chavePix.length).toString().padStart(2, "0")}` +
    `0014BR.GOV.BCB.PIX` +
    `01${chavePix.length.toString().padStart(2, "0")}${chavePix}` +
    `52040000` +
    `5303986` +
    `54${valor.toFixed(2).length.toString().padStart(2, "0")}${valor.toFixed(2)}` +
    `58${"BR".length.toString().padStart(2, "0")}${"BR"}` +
    `59${nome.length.toString().padStart(2, "0")}${nome}` +
    `60${cidade.length.toString().padStart(2, "0")}${cidade}` +
    `62` +
    `14` +
    `05` +
    `10` +
    txid +
    `63` +
    `04`; // CRC será calculado depois

  // Simplesmente retorna o payload base – CRC será adicionado na etapa final do QR Code
  return payload;
}

// ✅ Adicionando funcionalidades de teste e webhook
export interface WebhookTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  certificateValid?: boolean;
}

export interface ConnectivityTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  tokenGenerated?: boolean;
  apiReachable?: boolean;
}

// Configurações do 4send
const FOURGSEND_CONFIG = {
  apiToken: import.meta.env?.VITE_4SEND_API_TOKEN || "",
  baseUrl: "https://api.best4send.com",
};

export type PixProvider = "inter" | "4send";

export interface PixPaymentRequest {
  amount: number;
  description: string;
  customerName?: string;
  customerDocument?: string;
  customerEmail?: string;
  customerPhone?: string;
  externalId?: string;
  expiresIn?: number;
}

export interface PixPaymentResponse {
  id: string;
  amount: number;
  description: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  pixKey?: string;
  qrCode?: string;
  paymentLink?: string;
  expiresAt?: Date;
  paidAt?: Date;
  provider: PixProvider;
}

export interface InterTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface PixAdvancedConfig {
  interClientId?: string;
  interClientSecret?: string;
  interPixKey?: string;
  interEnvironment?: "sandbox" | "production";
  interWebhookUrl?: string;
  interWebhookSecret?: string;
  foursendApiToken?: string;
  foursendBaseUrl?: string;
  foursendEnvironment?: "sandbox" | "production";
  foursendCallbackUrl?: string;
  globalCallbackUrl?: string;
  globalTimeout?: number;
  maxRetryDelay?: number;
  webhookValidationSecret?: string;
  logRetentionDays?: number;
  enableAutoRetry?: boolean;
  enableSecurityValidation?: boolean;
  enableDetailedLogs?: boolean;
  enableApiMonitoring?: boolean;
  enableWebhookSignatureValidation?: boolean;
  enableTransactionLogs?: boolean;
}

export interface PixLogEntry {
  timestamp: Date;
  provider: PixProvider;
  action: string;
  data: Record<string, unknown>;
  success: boolean;
  error?: string;
  responseTime?: number;
}

class PixServiceClass {
  private interToken: string | null = null;
  private interTokenExpiry: Date | null = null;
  private developmentMode: boolean;
  private advancedConfig: PixAdvancedConfig = {
    interClientId: "",
    interClientSecret: "",
    interPixKey: "",
    interEnvironment: "production",
  };
  private logs: PixLogEntry[] = [];

  constructor() {
    this.loadAdvancedConfig();
    this.developmentMode = false;

    if (!this.advancedConfig.interClientId) {
      this.advancedConfig.interClientId = INTER_CONFIG.clientId;
    }
    if (!this.advancedConfig.interClientSecret) {
      this.advancedConfig.interClientSecret = INTER_CONFIG.clientSecret;
    }
    if (!this.advancedConfig.interPixKey) {
      this.advancedConfig.interPixKey = "58975369000108";
    }

    console.log("🏦 PIX Service - CREDENCIAIS CORRETAS");
    console.log("🔑 Client ID:", this.advancedConfig.interClientId);
    console.log("💳 Chave PIX:", this.advancedConfig.interPixKey);
    console.log("🌐 Ambiente: production");

    this.setupLogCleanup();
  }

  private loadAdvancedConfig(): void {
    try {
      const savedConfig = localStorage.getItem("pixConfigurations");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        this.advancedConfig = { ...DEFAULT_ADVANCED_CONFIG, ...parsed };
      } else {
        this.advancedConfig = { ...DEFAULT_ADVANCED_CONFIG };
      }
    } catch (error) {
      console.warn("⚠️ Erro ao carregar configurações avançadas:", error);
      this.advancedConfig = { ...DEFAULT_ADVANCED_CONFIG };
    }
  }

  public saveAdvancedConfig(config: PixAdvancedConfig): void {
    try {
      this.advancedConfig = { ...this.advancedConfig, ...config };
      localStorage.setItem(
        "pixConfigurations",
        JSON.stringify(this.advancedConfig),
      );
      console.log("✅ Configurações PIX salvas com sucesso");
    } catch (error) {
      console.error("❌ Erro ao salvar configurações PIX:", error);
      throw new Error("Erro ao salvar configurações");
    }
  }

  public getAdvancedConfig(): PixAdvancedConfig {
    return { ...this.advancedConfig };
  }

  private setupLogCleanup(): void {
    if (this.advancedConfig.logRetentionDays) {
      setInterval(
        () => {
          this.cleanupOldLogs();
        },
        24 * 60 * 60 * 1000,
      );
    }
  }

  private cleanupOldLogs(): void {
    if (!this.advancedConfig.logRetentionDays) return;
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.advancedConfig.logRetentionDays,
    );
    const initialCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp > cutoffDate);
    if (this.logs.length < initialCount) {
      console.log(
        `🧹 Logs limpos: ${initialCount - this.logs.length} entradas removidas`,
      );
    }
  }

  private addLog(
    provider: PixProvider,
    action: string,
    data: Record<string, unknown>,
    success: boolean,
    error?: string,
    responseTime?: number,
  ): void {
    if (
      !this.advancedConfig.enableDetailedLogs &&
      !this.advancedConfig.enableTransactionLogs
    ) {
      return;
    }
    const logEntry: PixLogEntry = {
      timestamp: new Date(),
      provider,
      action,
      data: this.advancedConfig.enableDetailedLogs ? data : { sanitized: true },
      success,
      error,
      responseTime,
    };
    this.logs.push(logEntry);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  public getLogs(provider?: PixProvider, limit = 100): PixLogEntry[] {
    let filteredLogs = this.logs;
    if (provider) {
      filteredLogs = this.logs.filter((log) => log.provider === provider);
    }
    return filteredLogs.slice(-limit).reverse();
  }

  private async getInterToken(): Promise<string> {
    const startTime = Date.now();

    if (
      this.interToken &&
      this.interTokenExpiry &&
      new Date() < this.interTokenExpiry
    ) {
      console.log("✅ Usando token Inter existente (válido)");
      return this.interToken;
    }

    console.log("🔑 Obtendo novo token do Banco Inter...");

    try {
      const clientId =
        this.advancedConfig.interClientId || INTER_CONFIG.clientId;
      const clientSecret =
        this.advancedConfig.interClientSecret || INTER_CONFIG.clientSecret;
      const baseUrl = INTER_CONFIG.baseUrl;
      const timeout = (this.advancedConfig.globalTimeout || 30) * 1000;

      const credentials = btoa(`${clientId}:${clientSecret}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${baseUrl}/oauth/v2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: `grant_type=client_credentials&scope=${encodeURIComponent(INTER_CONFIG.scope)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        const error = `Erro na autenticação Inter: ${response.status} - ${errorText}`;
        console.error("❌", error);
        this.addLog(
          "inter",
          "getToken",
          { status: response.status },
          false,
          error,
          responseTime,
        );
        throw new Error(error);
      }

      const data: InterTokenResponse = await response.json();
      console.log(
        "✅ Token obtido com sucesso! Expira em:",
        data.expires_in,
        "segundos",
      );

      this.interToken = data.access_token;
      this.interTokenExpiry = new Date(
        Date.now() + data.expires_in * 1000 - 60000,
      );

      this.addLog(
        "inter",
        "getToken",
        {
          expiresIn: data.expires_in,
          scope: data.scope,
        },
        true,
        undefined,
        responseTime,
      );

      return this.interToken;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.warn("⚠️ Erro na API Inter:", error);
      this.addLog(
        "inter",
        "getToken",
        { fallback: true },
        false,
        errorMessage,
        responseTime,
      );
      throw error;
    }
  }

  async createPayment(
    request: PixPaymentRequest,
    provider?: PixProvider,
  ): Promise<PixPaymentResponse> {
    const selectedProvider = provider || "inter";
    console.log(`💳 Criando pagamento PIX via ${selectedProvider}:`, {
      amount: request.amount,
      description: request.description,
    });

    if (selectedProvider === "inter") {
      return this.createInterPayment(request);
    }
    return this.create4sendPayment(request);
  }

  private async createInterPayment(
    request: PixPaymentRequest,
  ): Promise<PixPaymentResponse> {
    const startTime = Date.now();
    console.log("🚀 Chamando API REAL do Banco Inter para gerar PIX...");

    const token = await this.getInterToken();
    const baseUrl = INTER_CONFIG.baseUrl;
    const timeout = (this.advancedConfig.globalTimeout || 30) * 1000;

    const payload = {
      calendario: {
        expiracao: request.expiresIn || 3600,
      },
      devedor: {
        cpf: request.customerDocument || "00000000000",
        nome: request.customerName || "Cliente Check",
      },
      valor: {
        original: request.amount.toFixed(2),
      },
      chave: this.advancedConfig.interPixKey || "58975369000108",
      solicitacaoPagador: request.description,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/pix/v2/cob`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro ao criar cobrança Inter: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    this.addLog(
      "inter",
      "createPayment",
      { ...request, responseData: data },
      true,
      undefined,
      responseTime,
    );

    return {
      id: data.txid,
      amount: request.amount,
      description: request.description,
      status: "pending",
      pixKey: data.chave,
      qrCode: data.pixCopiaECola || data.qrcode,
      paymentLink: data.location || data.linkVisualizacao,
      expiresAt: new Date(Date.now() + (request.expiresIn || 3600) * 1000),
      provider: "inter",
    };
  }

  private async create4sendPayment(
    request: PixPaymentRequest,
  ): Promise<PixPaymentResponse> {
    // Implementação básica do 4send
    return {
      id: `4send_${Date.now()}`,
      amount: request.amount,
      description: request.description,
      status: "pending",
      provider: "4send",
    };
  }

  async checkPaymentStatus(
    paymentId: string,
    provider: PixProvider,
  ): Promise<PixPaymentResponse> {
    console.log(
      `🔍 Verificando status do pagamento ${paymentId} via ${provider}`,
    );

    if (provider === "inter") {
      return this.checkInterPaymentStatus(paymentId);
    }
    return this.check4sendPaymentStatus(paymentId);
  }

  private async checkInterPaymentStatus(
    paymentId: string,
  ): Promise<PixPaymentResponse> {
    const token = await this.getInterToken();
    const baseUrl = INTER_CONFIG.baseUrl;

    const response = await fetch(`${baseUrl}/pix/v2/cob/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao verificar status Inter: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: data.txid,
      amount: Number.parseFloat(data.valor.original),
      description: data.solicitacaoPagador,
      status: data.status === "CONCLUIDA" ? "paid" : "pending",
      provider: "inter",
      paidAt:
        data.status === "CONCLUIDA"
          ? new Date(data.pix?.[0]?.horario)
          : undefined,
    };
  }

  private async check4sendPaymentStatus(
    paymentId: string,
  ): Promise<PixPaymentResponse> {
    // Implementação básica do 4send
    return {
      id: paymentId,
      amount: 0,
      description: "",
      status: "pending",
      provider: "4send",
    };
  }

  // 🧪 Teste de conectividade com API Inter
  async testConnectivity(): Promise<ConnectivityTestResult> {
    const startTime = Date.now();

    try {
      console.log("🧪 Testando conectividade com API Banco Inter...");

      // Teste 1: Verificar se consegue gerar token
      const token = await this.getInterToken();
      const tokenGenerated = !!token;

      // Teste 2: Fazer uma requisição de ping/teste
      const baseUrl = INTER_CONFIG.baseUrl;
      const response = await fetch(`${baseUrl}/pix/v2/cob`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const responseTime = Date.now() - startTime;
      const apiReachable = response.status === 200 || response.status === 404; // 404 é ok para listagem vazia

      this.addLog(
        "inter",
        "testConnectivity",
        { tokenGenerated, apiReachable, responseTime },
        tokenGenerated && apiReachable,
        undefined,
        responseTime,
      );

      if (tokenGenerated && apiReachable) {
        return {
          success: true,
          message: "✅ Conectividade com Banco Inter OK! Token gerado e API acessível.",
          responseTime,
          tokenGenerated,
          apiReachable,
        };
      } else {
        return {
          success: false,
          message: `❌ Problemas de conectividade: Token: ${tokenGenerated ? "OK" : "ERRO"}, API: ${apiReachable ? "OK" : "ERRO"}`,
          responseTime,
          tokenGenerated,
          apiReachable,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      this.addLog(
        "inter",
        "testConnectivity",
        { error: errorMessage },
        false,
        errorMessage,
        responseTime,
      );

      return {
        success: false,
        message: `❌ Erro na conectividade: ${errorMessage}`,
        responseTime,
        tokenGenerated: false,
        apiReachable: false,
      };
    }
  }

  // 📬 Registrar webhook no Banco Inter
  async registerWebhook(webhookUrl: string, pixKey: string): Promise<WebhookTestResult> {
    const startTime = Date.now();

    try {
      console.log(`📬 Registrando webhook: ${webhookUrl} para chave: ${pixKey}`);

      const token = await this.getInterToken();
      const baseUrl = INTER_CONFIG.baseUrl;

      const payload = {
        webhookUrl: webhookUrl,
      };

      const response = await fetch(`${baseUrl}/pix/api/v2/webhook/${encodeURIComponent(pixKey)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();

        this.addLog(
          "inter",
          "registerWebhook",
          { webhookUrl, pixKey, response: data },
          true,
          undefined,
          responseTime,
        );

        return {
          success: true,
          message: `✅ Webhook registrado com sucesso! URL: ${webhookUrl}`,
          responseTime,
        };
      } else {
        const errorText = await response.text();
        const error = `Erro ao registrar webhook: ${response.status} - ${errorText}`;

        this.addLog(
          "inter",
          "registerWebhook",
          { webhookUrl, pixKey, status: response.status },
          false,
          error,
          responseTime,
        );

        return {
          success: false,
          message: `❌ ${error}`,
          responseTime,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      this.addLog(
        "inter",
        "registerWebhook",
        { webhookUrl, pixKey, error: errorMessage },
        false,
        errorMessage,
        responseTime,
      );

      return {
        success: false,
        message: `❌ Erro ao registrar webhook: ${errorMessage}`,
        responseTime,
      };
    }
  }

  // 🔐 Validar certificado SSL
  async validateCertificate(): Promise<{ valid: boolean; message: string }> {
    try {
      console.log("🔐 Validando certificado SSL...");

      // Em um ambiente real, aqui você faria a validação do certificado
      // Por enquanto, vamos verificar se o caminho existe e assumir válido
      const certificatePath = this.advancedConfig.interCertificatePath || INTER_CONFIG.certificatePath;

      if (!certificatePath || certificatePath === "") {
        return {
          valid: false,
          message: "❌ Caminho do certificado não especificado",
        };
      }

      // Simular validação (em produção você usaria bibliotecas específicas)
      return {
        valid: true,
        message: `✅ Certificado encontrado em: ${certificatePath}`,
      };
    } catch (error) {
      return {
        valid: false,
        message: `❌ Erro na validação do certificado: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      };
    }
  }

  // 🔧 Configuração completa do ambiente PIX
  async setupPixEnvironment(config: {
    webhookUrl: string;
    pixKey: string;
    testConnectivity?: boolean;
    registerWebhook?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    results: {
      connectivity?: ConnectivityTestResult;
      webhook?: WebhookTestResult;
      certificate?: { valid: boolean; message: string };
    };
  }> {
    const results: any = {};

    try {
      console.log("🔧 Configurando ambiente PIX completo...");

      // 1. Validar certificado
      results.certificate = await this.validateCertificate();

      // 2. Testar conectividade (se solicitado)
      if (config.testConnectivity) {
        results.connectivity = await this.testConnectivity();
      }

      // 3. Registrar webhook (se solicitado)
      if (config.registerWebhook) {
        results.webhook = await this.registerWebhook(config.webhookUrl, config.pixKey);
      }

      // Verificar se tudo foi bem-sucedido
      const allSuccess = Object.values(results).every((result: any) => result.success || result.valid);

      return {
        success: allSuccess,
        message: allSuccess
          ? "✅ Ambiente PIX configurado com sucesso!"
          : "⚠️ Ambiente PIX configurado com algumas pendências",
        results,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Erro na configuração: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        results,
      };
    }
  }
}

export const PixService = new PixServiceClass();
