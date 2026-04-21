这是一份经过深度整合的 **SoloOS（一人公司操作系统）** 全量核心方案。它将你作为开发者的技术直觉与 Solopreneur 的商业逻辑进行了最终闭环。

---

## 1. 产品文档与用户故事 (Product & User Stories)

### 产品定位
**SoloOS** 是专为开发者设计的、由数据驱动的“一人公司”决策与执行系统。它通过 **Input/Output/Audience/Financial/Energy** 五大支柱，将零散的开发活动转化为结构化的商业增长飞轮。

### 核心用户 (ICP)
* **独立开发者：** 具备全栈能力，有多个 side project，但苦于管理混乱、获客无力或情绪波动。
* **技术创始人：** 正在从“写代码”向“运营公司”转型的 Solopreneur。

### 用户故事 (User Stories)
* **场景 A (无感记录):** *“作为一个忙碌的开发者，我希望在终端敲一行命令就能记录灵感，而不是打开复杂的 Notion。我希望系统能自动知道这个灵感属于哪个项目。”*
* **场景 B (商业洞察):** *“作为一个创始人，我需要知道我花在项目 A 上的精力（Commits）是否换回了相应的收入（ROI），以便我决定是否砍掉它。”*
* **场景 C (心理韧性):** *“作为一个独行者，我需要系统在周末强制锁定，要求我复盘。通过五边形图，它能告诉我当前的焦虑是因为没钱了，还是因为太久没休息。”*

---

## 2. 系统设计架构 (System Architecture)

SoloOS 采用 **Headless（无头）** 设计逻辑，底座负责数据主权，中间层负责业务转换，展示层负责认知升维。



### A. 基座层 (The Base - Storage & CLI)
* **物理形态：** 本地运行的 Go 服务 + SQLite。
* **接入规范：** 开放标准 OpenAPI，支持第三方 Skill 以 API 形式接入（API to Skill）。
* **输入入口：** 极简 CLI（`solo capture`）和 Webhooks。

### B. 中间层 (The Middleware - Logic & Skills)
* **项目引擎 (Project Engine):** 采用“代码仓库名（GitHub Repo）”作为主键种子，自动实例化项目。
* **归因处理器 (Attribution Processor):** 执行“活跃度平摊算法”，将公共支出按 Commit 比例自动分摊给各项目。
* **AI 转换器 (AI Transformer):** 异步将原始 `Entry` 转换为带标签、带关联的 `Event`。

### C. 展示层 (The Presentation - Cockpit)
* **形态：** Next.js 驱动的本地 Web 仪表盘。
* **交互逻辑：** **阻塞式评审（Review Gate）**。若未完成周期性复盘，系统将锁定宏观看板，强制进行战略对齐。

---

## 3. 核心数据结构 (Core Data Structures)

### 核心表结构
| 对象 | 核心字段 | 物理属性 |
| :--- | :--- | :--- |
| **Entry (输入)** | `id, content, timestamp, source_stream, raw_payload` | 原始、不可变 |
| **Event (事件)** | `id, entry_id, pillar_type, project_id, impact_score, metadata` | 结构化、逻辑映射 |
| **Project (项目)** | `id, name, repo_seed, status, roi_cache, last_active` | 高阶逻辑容器 |
| **Review (评审)** | `id, period (W/M), snapshot_data, user_reflection, ai_insight` | 状态锁、系统快照 |

### 数据关联模型 (The Linkage)
* **1 : N :** 一个 Project 包含多个 Event（支出、代码、人脉）。
* **N : 1 :** 多个 Event 溯源至同一个 Entry（如一条推文可能同时产生认知和获客）。
* **时序性 :** 所有对象必须携带 `timestamp`，用于生成趋势线图和五边形 Radar。

---

## 4. 输入与输出规范 (I/O Specification)

### 输入 (Input) - 多源汇聚
1.  **主动输入 (Manual):** CLI 命令 `solo c "调研了 OpenAI 调价政策"`。
2.  **自动捕获 (Skill Driven):** * `Github Skill`: 监听 Push，自动创建/更新项目进度。
    * `Billing Skill`: 监听支付回调，自动记录支出。
3.  **认知采集 (Clip):** 浏览器插件将 URL 喂给底座。

### 输出 (Output) - 多维反馈
1.  **宏观态势:** 五边形评分图（实时平衡度监控）。
2.  **项目洞察:** 每个项目的“投入/产出比”分析报告。
3.  **执行清单:** 从“阻塞式评审”中产出的下一阶段 Action Items。
4.  **OpenAPI:** 允许你构建自己的 Skill 来读取这些分析结果（如：在你的 App 内部显示“当前公司余额”）。

---

## 5. 总结：MVP 启动核心路径
1.  **定义 Schema:** 完成上述四张核心表的 SQLite 初始化。
2.  **实现 CLI:** 确保 `solo capture` 能快速写入 `Entry`。
3.  **编写 GitHub Skill:** 实现通过 Repo Name 自动创建 Project 的逻辑。
4.  **构建 Review UI:** 实现阻塞式逻辑，作为进入看板的“入场券”。
