# Contas — Controle de Contas e Assinaturas (Expo)

Aplicativo mobile para acompanhar contas a pagar, assinaturas, contas recorrentes e lançamentos manuais/parcelados, construído com **Expo (SDK 58)**, **React Native**, **TypeScript** e componentes nativos do iOS seguindo a **UI padrão Apple (HIG)**.

## Funcionalidades

- **Visão mensal clara (`Contas`):**
  - Resumo com total restante a pagar, progresso pago/total e indicador de contas atrasadas.
  - Navegação entre meses com geração automática e idempotente das recorrências.
  - Filtros rápidos (`Todas`, `Pendentes`, `Assinaturas`, `Recorrentes`, `Manuais`).
  - Agrupamento por urgência (*Atrasadas*, *Vence hoje ou em breve*, *Ainda este mês* e *Pagas* recolhível).
  - Pagamento rápido com 1 toque ou *swipe*, feedback tátil (`expo-haptics`) e confirmação de valor final para contas variáveis (ex.: energia/água).
- **Assinaturas e Contas Fixas (`Fixas`):**
  - Resumo mensal e projeção anual de assinaturas + total mensal de contas fixas.
  - *Swipe* para pausar, reativar ou excluir sem perder o histórico de meses anteriores.
- **Histórico (`Histórico`):**
  - Gráfico comparativo dos últimos 6 meses (Pago vs. Pendente).
  - Busca nativa do iOS por nome ou categoria e filtro por status.
- **Lembretes e Backup (`Ajustes`):**
  - Notificações locais agendadas no aparelho (`expo-notifications`) com horário e antecedência configuráveis.
  - Exportação e restauração de backup completo em JSON.
  - Opção para carregar contas de exemplo.

## Stack

- **Expo SDK 58** + **Expo Router** (`NativeTabs` + `Stack` nativo com `headerLargeTitle`)
- **SF Symbols nativos** via `expo-symbols`
- **Persistência local:** `@react-native-async-storage/async-storage`
- **Gestos & Haptics:** `react-native-gesture-handler` (`ReanimatedSwipeable`) e `expo-haptics`
- **Notificações & Arquivos:** `expo-notifications`, `expo-file-system`, `expo-sharing`, `expo-document-picker`

## Como rodar

```bash
# Instalar dependências
npm install

# Iniciar o servidor Expo
npx expo start
```

- **No iPhone:** abra o app **Expo Go** e escaneie o QR Code exibido no terminal.
- **No Simulador iOS:** pressione `i` no terminal do Expo (ou rode `npx expo start --ios`).
- **Typecheck:** `npx tsc --noEmit`

## Estrutura do projeto

```text
app/
  _layout.tsx                 # Providers raiz (GestureHandler, BillsProvider)
  (tabs)/
    _layout.tsx               # NativeTabs (UITabBarController nativo iOS)
    (home)/                   # Aba Contas (mês atual, resumo e pagamentos)
    (fixed)/                  # Aba Fixas (assinaturas e contas recorrentes)
    (history)/                # Aba Histórico (gráfico 6 meses + busca)
    (settings)/               # Aba Ajustes (notificações, backup JSON, exemplo)
src/
  components/                 # BillRow, MonthlySummaryCard, AddEditBillModal, AppleIcon
  context/                    # BillsContext (estado + AsyncStorage)
  services/                   # billService (regras puras) e notificationService
  theme/                      # appleColors (Light/Dark semântico iOS)
  types/                      # Modelos e metadados de categorias
```
