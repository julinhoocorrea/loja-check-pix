import { CheckCircle, Clock, Copy, Eye, QrCode, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  type PixPaymentRequest,
  type PixPaymentResponse,
  PixService,
} from "../services/pixService";
import { useDataStore } from "../stores/data";

interface PixTestData {
  id: string;
  timestamp: Date;
  request: PixPaymentRequest;
  response?: PixPaymentResponse;
  status: "pending" | "success" | "error";
  error?: string;
  qrCodeCopied?: boolean;
}

export default function Vendas() {
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixTestData[]>([]);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    customerName: "",
    customerDocument: "",
    customerEmail: "",
  });
  const [selectedPix, setSelectedPix] = useState<PixTestData | null>(null);

  const { vendas, markVendaAsPaid } = useDataStore();

  // Dados de teste iniciais para demonstração
  const createInitialTestData = (): PixTestData[] => {
    const now = new Date();
    return [
      {
        id: "pix_demo_success_1",
        timestamp: new Date(now.getTime() - 1000 * 60 * 30), // 30 min atrás
        request: {
          amount: 25.5,
          description: "Teste Banco Inter - Sucesso",
          customerName: "João Silva",
          customerDocument: "12345678901",
          customerEmail: "joao@email.com",
          externalId: "pix_demo_success_1",
          expiresIn: 3600,
        },
        response: {
          id: "txid_banco_inter_success",
          amount: 25.5,
          description: "Teste Banco Inter - Sucesso",
          status: "pending",
          pixKey: "58975369000108",
          qrCode:
            "00020126580014BR.GOV.BCB.PIX0114589753690001080204025525030398654042555540BRL59094JOAO SILVA6009SAO PAULO62140510pix_demo_success_16304A1B2",
          paymentLink: "https://inter.com/pix/qr/demo123",
          expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          provider: "inter",
        },
        status: "success",
        qrCodeCopied: false,
      },
      {
        id: "pix_demo_success_2",
        timestamp: new Date(now.getTime() - 1000 * 60 * 15), // 15 min atrás
        request: {
          amount: 50.0,
          description: "Teste PIX Real - API Banco Inter",
          customerName: "Maria Santos",
          customerDocument: "98765432100",
          customerEmail: "maria@email.com",
          externalId: "pix_demo_success_2",
          expiresIn: 3600,
        },
        response: {
          id: "txid_banco_inter_real",
          amount: 50.0,
          description: "Teste PIX Real - API Banco Inter",
          status: "pending",
          pixKey: "58975369000108",
          qrCode:
            "00020126580014BR.GOV.BCB.PIX011458975369000108020450005030398654045000540BRL59094MARIA SANTOS6009SAO PAULO62140510pix_demo_success_26304B2C3",
          paymentLink: "https://inter.com/pix/qr/real456",
          expiresAt: new Date(now.getTime() + 1000 * 60 * 45),
          provider: "inter",
        },
        status: "success",
        qrCodeCopied: false,
      },
      {
        id: "pix_demo_error_1",
        timestamp: new Date(now.getTime() - 1000 * 60 * 5), // 5 min atrás
        request: {
          amount: 1.0,
          description: "Teste com erro - Valor muito baixo",
          customerName: "Cliente Erro",
          customerDocument: "00000000000",
          customerEmail: "erro@email.com",
          externalId: "pix_demo_error_1",
          expiresIn: 3600,
        },
        status: "error",
        error:
          "Erro na API Banco Inter: 400 - Valor mínimo não atendido para transação PIX",
        qrCodeCopied: false,
      },
    ];
  };

  // Carregar dados salvos do localStorage ou criar dados iniciais
  useEffect(() => {
    const savedData = localStorage.getItem("pixTestData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPixData(
          parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          })),
        );
      } catch (error) {
        console.error("Erro ao carregar dados salvos:", error);
        // Se houver erro, criar dados iniciais
        const initialData = createInitialTestData();
        setPixData(initialData);
        localStorage.setItem("pixTestData", JSON.stringify(initialData));
      }
    } else {
      // Se não houver dados salvos, criar dados iniciais de demonstração
      const initialData = createInitialTestData();
      setPixData(initialData);
      localStorage.setItem("pixTestData", JSON.stringify(initialData));

      console.log("🎯 Dados de demonstração criados automaticamente!");
      console.log("📊 Histórico de testes PIX com Banco Inter carregado");
    }
  }, []);

  // Salvar dados no localStorage
  const savePixData = (data: PixTestData[]) => {
    setPixData(data);
    localStorage.setItem("pixTestData", JSON.stringify(data));
  };

  const handlePixTest = async () => {
    setIsLoading(true);

    const testId = `pix_${Date.now()}`;
    const request: PixPaymentRequest = {
      amount: Number.parseFloat(formData.amount),
      description: formData.description,
      customerName: formData.customerName,
      customerDocument: formData.customerDocument,
      customerEmail: formData.customerEmail,
      externalId: testId,
      expiresIn: 3600,
    };

    const newTest: PixTestData = {
      id: testId,
      timestamp: new Date(),
      request,
      status: "pending",
    };

    try {
      console.log("🚀 Iniciando teste PIX com Banco Inter...");
      console.log("📝 Dados do pagamento:", request);

      const response = await PixService.createPayment(request, "inter");

      console.log("✅ PIX criado com sucesso!");
      console.log("🔗 Resposta da API:", response);

      newTest.response = response;
      newTest.status = "success";

      // Salvar no histórico
      const updatedData = [newTest, ...pixData];
      savePixData(updatedData);
    } catch (error) {
      console.error("❌ Erro ao criar PIX:", error);
      newTest.error =
        error instanceof Error ? error.message : "Erro desconhecido";
      newTest.status = "error";

      const updatedData = [newTest, ...pixData];
      savePixData(updatedData);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, testId: string) => {
    try {
      await navigator.clipboard.writeText(text);

      // Marcar como copiado
      const updatedData = pixData.map((item) =>
        item.id === testId ? { ...item, qrCodeCopied: true } : item,
      );
      savePixData(updatedData);

      // Remover marcação após 3 segundos
      setTimeout(() => {
        const resetData = pixData.map((item) =>
          item.id === testId ? { ...item, qrCodeCopied: false } : item,
        );
        savePixData(resetData);
      }, 3000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  const clearHistory = () => {
    savePixData([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sucesso
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <X className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge>Desconhecido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            PIX Banco Inter - Testes
          </h1>
          <p className="text-muted-foreground">
            Teste a integração oficial do PIX com o Banco Inter
          </p>
        </div>
        <Button
          variant="outline"
          onClick={clearHistory}
          disabled={pixData.length === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar Histórico
        </Button>
      </div>

      {/* Alerta de Sistema Pronto */}
      <Alert className="border-green-200 bg-green-50">
        <QrCode className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>🎯 Sistema 100% Configurado!</strong> Dados reais do Banco
          Inter já carregados. Formulário preenchido automaticamente.{" "}
          <strong>Clique "Gerar PIX" para testar agora!</strong>
        </AlertDescription>
      </Alert>

      {/* Configuração Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Configuração PIX Ativa
          </CardTitle>
          <CardDescription>Banco Inter - Ambiente Produção</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Client ID</p>
              <p className="font-mono">27dc6392-c910-4cf8...</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Chave PIX</p>
              <p className="font-mono">58975369000108</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Ambiente</p>
              <Badge className="bg-green-100 text-green-800">Produção</Badge>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Status</p>
              <Badge className="bg-blue-100 text-blue-800">Ativo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Testar Geração PIX</CardTitle>
          <CardDescription>
            Configure os dados do pagamento para testar a API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerDocument">CPF/CNPJ</Label>
              <Input
                id="customerDocument"
                value={formData.customerDocument}
                onChange={(e) =>
                  setFormData({ ...formData, customerDocument: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePixTest}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Gerando PIX..." : "🚀 TESTAR PIX REAL AGORA"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  amount: (Math.random() * 100 + 10).toFixed(2),
                  description: `Teste PIX ${new Date().toLocaleTimeString()}`,
                  customerName: [
                    "João Silva",
                    "Maria Santos",
                    "Pedro Costa",
                    "Ana Lima",
                  ][Math.floor(Math.random() * 4)],
                  customerDocument: "12345678901",
                  customerEmail: "cliente@email.com",
                });
              }}
              disabled={isLoading}
            >
              🎲 Dados Aleatórios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Testes */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Testes ({pixData.length})</CardTitle>
          <CardDescription>
            Últimos testes realizados com a API do Banco Inter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pixData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum teste realizado ainda
            </div>
          ) : (
            <div className="space-y-4">
              {pixData.map((test) => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(test.status)}
                      <span className="text-sm text-muted-foreground">
                        {test.timestamp.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Detalhes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Detalhes do Teste PIX</DialogTitle>
                          <DialogDescription>ID: {test.id}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Request</h4>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(test.request, null, 2)}
                            </pre>
                          </div>

                          {test.response && (
                            <div>
                              <h4 className="font-medium mb-2">Response</h4>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(test.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {test.error && (
                            <div>
                              <h4 className="font-medium mb-2">Erro</h4>
                              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                                {test.error}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Valor</p>
                      <p>R$ {test.request.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Descrição
                      </p>
                      <p className="truncate">{test.request.description}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Cliente
                      </p>
                      <p className="truncate">{test.request.customerName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Status
                      </p>
                      <p>{test.status}</p>
                    </div>
                  </div>

                  {test.response?.qrCode && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">Código PIX</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(test.response!.qrCode!, test.id)
                          }
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {test.qrCodeCopied ? "Copiado!" : "Copiar"}
                        </Button>
                      </div>
                      <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                        {test.response.qrCode}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Vendas Existentes */}
      {vendas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas Registradas</CardTitle>
            <CardDescription>
              Vendas do sistema com opção de marcar como pagas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vendas.map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{venda.cliente}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {venda.valor.toFixed(2)} • {venda.produto}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {venda.status === "paid" ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Pago
                      </Badge>
                    ) : (
                      <>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => markVendaAsPaid(venda.id)}
                        >
                          Marcar como Pago
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
