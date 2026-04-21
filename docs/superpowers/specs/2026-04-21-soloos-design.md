# SoloOS — 设计规格文档

**日期：** 2026-04-21
**状态：** 已确认，待实现

---

## 1. 产品定位

SoloOS 是一个为**具备开发能力的 Solopreneur** 设计的、本地运行的"一人公司商业闭环操作系统（Business Loop OS）"。

它不是笔记软件，而是一个**将数据输入转化为商业决策的编译器**，核心价值是：把散落在代码、收入、内容、精力之间的信号，通过五大支柱自动关联，生成可供决策的洞察。

### 核心用户

独立开发者 / 技术型创始人，相信"代码即系统"，追求数据主权，不满足于碎片化 SaaS 工具。

### 关键差异化

- **关联优先**：产品灵魂是跨维度关联（Input → Output → Financial），而非记录本身
- **系统驱动**：Project 自动从数据中涌现，不需要人工维护
- **数据主权**：全量本地运行，无云依赖，数据存 `~/.soloos/soloos.db`

---

## 2. 五大支柱（Pillars）

| 支柱 | 类型 | 含义 | 典型事件 |
|------|------|------|---------|
| Input | 认知 | 信息摄入、学习、调研 | 读了一篇竞品分析 |
| Output | 产能 | 代码提交、内容发布、交付 | GitHub Commit、发布文章 |
| Audience | 人脉 | 用户增长、深度互动 | 新增付费用户、商务对接 |
| Financial | 财务 | 现金流变动、刚性成本 | Stripe 到账、SaaS 扣费 |
| Energy | 精力 | 状态异常信号 | 连续加班、失眠、成就感 |

---

## 3. 技术栈

### 项目结构

pnpm workspace Monorepo，三个包：

```
SoloOS/
├── apps/
│   ├── server/        # Hono + TypeScript + SQLite
│   └── web/           # Vite + React
├── packages/
│   └── shared/        # 共享 TypeScript 类型定义
└── package.json
```

### 选型

| 层 | 技术 | 理由 |
|----|------|------|
| Server | Hono + TypeScript | 轻量 TS-first，比 Express 快 |
| ORM | Drizzle ORM | SQLite 原生，类型安全 |
| Web | Vite + React | 开发体验最快 |
| UI | shadcn/ui + Recharts | 组件完整，Radar/Sparkline 支持 |
| 数据请求 | TanStack Query | 缓存 + 异步状态管理 |

### 启动方式

```bash
pnpm dev   # 同时启动 server :3000 + web :5173
```

---

## 4. 数据模型

### 4.1 核心表

#### `entries` — 原始输入（不可变）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| content | TEXT | 原始内容：文字、URL、JSON |
| source | TEXT | cli / github / stripe / browser-ext |
| status | TEXT | pending / processed |
| quick_tags | TEXT | JSON array，用户随手标签 |
| created_at | INTEGER | Unix timestamp |

#### `events` — 核心原子（结构化）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| entry_id | TEXT FK | → entries |
| pillar | TEXT | INPUT / OUTPUT / AUDIENCE / FINANCIAL / ENERGY |
| project_id | TEXT FK? | → projects，可为空 |
| impact_score | INTEGER | -10 到 10，对该支柱的影响 |
| classifier | TEXT | rule / api-key / skill，记录谁分类的 |
| metadata | TEXT | JSON，扩展字段 |
| occurred_at | INTEGER | 事件发生时间 |
| created_at | INTEGER | 写入时间 |

#### `projects` — 逻辑聚合器

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| name | TEXT | 项目名，可自动命名 |
| status | TEXT | active / dormant / completed |
| match_rules | TEXT | JSON，repo 名 / tag 规则 |
| is_auto | INTEGER | 0=手动创建，1=系统自动发现 |
| first_event_at | INTEGER | 定义项目开始时间 |
| last_event_at | INTEGER | 14 天无更新自动转 dormant |
| created_at | INTEGER | |

> ROI = SUM(Financial events impact) 实时从 events 计算，不存冗余字段。

#### `reviews` — 周期评审（Review Gate 状态机）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | UUID |
| period | TEXT | weekly / monthly |
| period_start | INTEGER | |
| period_end | INTEGER | |
| snapshot | TEXT | JSON，该周期各 Pillar 统计快照 |
| reflection | TEXT | 用户手写复盘 |
| ai_insight | TEXT | AI 生成趋势分析 |
| completed_at | INTEGER | **NULL = 未完成，触发 Review Gate 锁定** |

### 4.2 关联表

#### `event_links` — 跨维度关联（产品灵魂）

| 字段 | 类型 | 说明 |
|------|------|------|
| source_event_id | TEXT FK | → events |
| target_event_id | TEXT FK | → events |
| link_type | TEXT | caused / related / derived |
| confidence | REAL | 0~1，AI 置信度；1.0 = 人工确认 |
| created_by | TEXT | rule / ai / human |

关联示例：`Input（竞品分析）→ caused → Output（动态定价 Feature）→ derived → Financial（$99 收入）`

---

## 5. AI 分类层

### 分类机制：规则优先 + AI 兜底（混合模式）

**规则层**（无需 AI，覆盖 ~80% 场景）：
- GitHub webhook → pillar: OUTPUT，自动按 repo 名归入 Project
- Stripe webhook → pillar: FINANCIAL
- CLI 带 `-p` 参数 → 用户指定 pillar

**AI 层**（兜底未匹配的 CLI 自由输入）：

Server 暴露两个统一端点，分类器外挂：

```
GET  /api/entries?status=pending   # 拉取待分类条目
POST /api/events/batch             # 批量写回分类结果
```

### 两种 AI 分类模式

**模式 1：API Key 模式**
- 用户在 `~/.soloos/config.json` 配置任意 OpenAI-compatible API Key
- Server 自动调用，全异步，无需人工触发
- 支持 OpenAI / Anthropic / 本地模型等任意 provider

**模式 2：Agent Skill 模式**
- SoloOS 提供 Claude Code Skill（`soloos-classifier`）
- 用户安装到自己的 Claude Code Agent，定时或手动触发
- Skill 拉取 pending entries → Claude 分类 → 批量回写
- 适合已在使用 Claude Code 的用户，借用现有会话

---

## 6. UI 设计

### 导航模型

三层递进，混合路由 + 侧滑面板：

```
Cockpit (/)  →[点击支柱/项目]→  Explorer (/explorer)  →[点击事件]→  Sheet 侧滑 (Node)
```

Node 层使用 shadcn `<Sheet side="right">` 叠加在 Explorer 上，保留上下文。

### 第一层：Cockpit（宏观态势）

路由：`/`

- **五边形 Radar Chart**（Recharts RadarChart）：实时显示五支柱平衡度
- **Pulse 指标卡**（shadcn Card）：现金流斜率、产能速率、用户增长率
- **30 日 Sparklines**：各支柱波动趋势
- **Review Gate**：`completed_at = NULL` 时整个 Cockpit 替换为 `<ReviewGate />` 强制复盘页

### 第二层：Explorer（实体管理）

路由：`/explorer`

- **Tabs**（shadcn Tabs）：Projects | Pillars 两个视图
- **Projects 视图**：Bento Grid 项目卡片，显示 ROI、事件数、各 Pillar 分布
  - 卡片点击进入该项目的事件时间流
  - AI 发现潜在新项目时，出现虚线"待确认"卡片
- **Pillars 视图**：按支柱分组的事件时间流（ScrollArea）
- **手动关联**：顶部按钮触发 Dialog，支持 `solo p link <event_id> <project_id>`

### 第三层：Node（原子详情）

触发：点击任意 Event → `<Sheet side="right">` 滑入

- **事件内容**：原始 content + 来源 + 时间
- **关联链路**：可视化展示 `event_links`（Input → Output → Financial 的因果链）
- **校准面板**：
  - AI 置信度显示
  - 确认关联 / 断开 / 手动调整
  - `confidence = 1.0` 代表人工确认，成为 Fine-tuning 数据

### 全局 Layout Shell

- 固定图标侧边栏（52px）：Cockpit / Explorer / Review / Settings
- 顶部状态条：当前系统健康状态 + 本周 Review 状态

### shadcn 组件映射

| 功能 | 组件 |
|------|------|
| 项目卡片 / 指标卡 | `Card` |
| Explorer 视图切换 | `Tabs` |
| Node 详情面板 | `Sheet side="right"` |
| Pillar 标签 | `Badge` variant |
| 手动关联 | `Dialog` |
| 事件列表 | `ScrollArea` |
| 关联确认按钮 | `Button` variant |
| Review Gate | 全屏替换组件 |

---

## 7. MVP 最小可行范围（V1）

V1 目标：**CLI 写入一条 Entry，Dashboard 上看到产能曲线和财务曲线联动**。

### V1 包含

1. **数据层**：完整 SQLite schema（5 张表）+ Drizzle ORM
2. **Server**：`POST /api/entries`、`GET /api/events`、`GET /api/projects`、Webhook 接收（GitHub / Stripe）
3. **规则分类器**：GitHub → OUTPUT，Stripe → FINANCIAL，自动项目归因
4. **CLI**：`solo capture "内容"` 写入 Entry，`solo capture -p input "内容"` 指定 Pillar
5. **Cockpit**：Radar Chart + 3 个 Pulse 指标卡 + Review Gate 逻辑
6. **Explorer**：Projects Bento Grid + 事件时间流
7. **Node**：Sheet 侧滑，显示事件详情 + 基础关联链路

### V2（后续迭代）

- AI 分类（模式 1：API Key 配置）
- AI 分类（模式 2：Claude Code Skill）
- 跨 Pillar 关联图谱（event_links 可视化）
- Weekly Review AI Insight 生成
- 浏览器插件（URL 摄入）
- 30 日 Sparklines 趋势图

---

## 8. 关键设计约束

1. **本地优先**：所有数据存本地，无网络依赖（AI 分类除外，且可选）
2. **数据不可变**：Entry 写入后不修改，Event 是加工层
3. **Review Gate 是行为约束**：不是提醒，是物理锁定——未完成复盘则 Cockpit 不可访问
4. **Project 不需人工维护**：通过 `match_rules` 自动聚合，人工只需在 Review 时校准
5. **分类器是开放接口**：任何外部程序都可以通过两个端点接入，不绑定特定 AI
