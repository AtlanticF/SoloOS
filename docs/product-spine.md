# SoloOS — 产品主线与闭环（Product Spine）

> 这份文档是 SoloOS **「用户故事线路 + 核心闭环」的单一真相源**，用于回答"我现在
> 在主线的哪一节、下一步该闭合什么"。深层论证见 [`README.md`](./README.md) §Architecture
> （theory of origin）、[`DESIGN.md`](./DESIGN.md)（视觉系统）、
> [`docs/superpowers/specs/2026-06-01-soloos-v0.1.0-target-design.md`](./superpowers/specs/2026-06-01-soloos-v0.1.0-target-design.md)（v0.1.0 目标）。
> 现状部分按 **2026-06-03 的真实代码**核对（117/117 server 测试绿，shared+server `tsc` 干净）。

---

## 1. 核心理念（first principles）

SoloOS 是给开发者的「一人公司」操作系统。剥到第一性原理，一个 solo business 永远在
跑同一个最小回路：

```
signal in → processing → shippable value → return → enough energy to run again
信号入        处理          可交付价值        回报        还有能量再跑一轮
```

SoloOS 不发明新流程，它只做一件事:**把这个回路变得可观测、可掌舵**，而不是埋在收
件箱和一堆 SaaS 仪表盘里。一个 cybernetic 的速写:

$$\text{Value} = \int_{t_0}^{t_1} \frac{\text{Output} \times \text{Audience}}{\text{Energy Cost}}\, dt$$

三条不可妥协的设计承诺(判断任何新功能是否"属于 SoloOS"的标尺):

1. **Local-first / dogfood-first** —— 数据只在本地 `~/.soloos/soloos.db`;首要用户是
   你自己(builder, user #1)。没有云、没有噪音、没有装饰性 chrome。
2. **Event-sourcing(append-only)** —— 系统记录的不是可被悄悄覆盖的"当前状态",而是
   不可变事实的追加日志。Review 时可以 replay / reframe / re-attribute,校准才诚实。
3. **Cybernetic Review Gate(强制负反馈)** —— 每周 Review **阻塞** Cockpit,逼你测量
   "意图 vs 现实"的漂移并掌舵,而不是只顾累积数据。

---

## 2. 唯一的用户故事 + 闭环

整个产品**只有一个核心用户故事**,一切工作都必须能回答"我给这个环贡献了哪一节":

> 终端一行 capture → 自动归到一个 **project** + 五支柱之一 → 在 Cockpit 上呈现为五轴
> **balance** → 每周一道**强制 Review Gate**,不反思就进不了 Cockpit。

```
  solo capture · solo energy 3 · GitHub webhook · agent-cost sync
        │   ① 信号入(input entropy)
        ▼
  Entry ──► 分类 Event(归到 project + 五支柱之一)        ← event-sourced, append-only
        │   ② 处理
        ▼
  Cockpit 雷达 ── 五轴诚实呈现(无占位轴)
  Input · Output · Audience · Financial · Energy            ← ③ 把价值变得可观测
        │   每轴 0–100,相对自己的滚动基线
        ▼
  每周 Review Gate(阻塞 Cockpit,必须反思才放行)
   · 反思文本  · Energy 评分(强制)
   · 每项目 continue / pause / kill / double_down 决策
     (由 return − output cost − agent cost 支撑)             ← ④ 回报 + 掌舵(负反馈)
        │
        ▼
  回到 capture,且还有足够 Energy 再跑一轮  ── ⑤ 飞轮闭合
```

UI 即这条线(`apps/web/src/pages/`):**Explorer**(项目)·**Cockpit**(五轴雷达 + Pulse)
·**Output**(项目经济性)·**Review**(Review Gate)·**Settings**(provider/连接器配置)。

---

## 3. 五支柱:怎么喂 + 现状

关键洞察:**四个是 flow(周期内的活动/吞吐),Energy 是 level(操作者状态)**;同一根
0–100 轴,但算法不同。

| 支柱 | 类 | 一个 event 是什么 | 喂入来源 | 现状(2026-06-03 已验证在代码中) |
|---|---|---|---|---|
| **Input** · Emerald | flow | 一条学习/想法/todo | `solo capture` → insight INBOX → 晋升为 INPUT event | ⚠️ 代码在,但 dogfood 证明:plain capture 落 INBOX(`event_id:null`),**不晋升就不上雷达** → **0011** |
| **Output** · Indigo | flow | 一次 commit / 交付 | GitHub webhook(commits) | ✅ dogfood 验证轴会动 |
| **Audience** · Amber | flow | star/watcher/fork/follower 增量,或手动触点 | GitHub-social + 手动 capture | ✅ dogfood 验证轴会动 |
| **Financial** · Red | flow | 营收或 AI 花费的资金流动 | agent-cost ledger(spend)+ 手动营收 | ⚠️ `agent-cost/` 代码完成,但 dogfood 证明:**ledger 没接进 Financial 雷达轴**($12.50 spend 不上雷达,只进 Review 汇总)→ **0010** |
| **Energy** · Violet | **level** | 一次操作者状态自评 | `solo energy <1–5>` + Review 强制评分 | ✅ CLI + Review Gate;dogfood 验证 Gate 强制评分并回写 ENERGY event |

> **dogfood 校准(2026-06-04):** 闭环跑通、Review Gate 强制有效(缺 energy / 缺
> agent_cost_decision 都返回 400),完成时回写一条 ENERGY event 闭合飞轮。但"五轴诚实"
> 还差两处:**Financial 轴没接 agent-cost ledger(→ 0010)**、**Input 轴需要 insight
> 从 INBOX 晋升(→ 0011)**。Output / Audience / Energy 三轴经真实捕获验证会动。

---

## 4. 线路:每块工作落在闭环的哪个节点

把所有 plan 投影到上面那张图,就是清晰的"线路":

**✅ 已完成(核心 spine,在 `completed/`)**
- `0008-five-pillar-completion` —— 补齐 Energy + Audience,五轴全部诚实喂入。**节点 ①②③④**。
- `0009-mode1-remote-client` —— 连接拓扑 seam(本地数据 + 托管客户端),数据不离开 localhost。**承载层,非主线节点**。
- `0001-recon` —— 代码勘探,ARCHITECTURE.md「Domains & layers」已填。**脚手架**。

**🔧 进行中 —— 同一个 Financial 故事(节点 ④ 的"经济性"输入)**
- `0005-agent-cost-ledger` + `0006-agent-cost-provider-ui` + `0007-personal-agent-cost-connectors`
  本质是**一个 slice 被切成三段**:*"把 AI agent 花费按 project 记账,让周 Review 看到
  真实经济性 return − output cost − agent cost"*。**全部代码完成、测试绿,但生命周期未收口**
  (从未走完 evaluate → checkpoint → done)。它只服务节点 ④ 的一个输入,不该被当成三个独立产品。

**🆕 dogfood 发现的两个断点(节点 ③ 雷达诚实)**
- `0010-financial-axis-agent-cost` —— 把 agent-cost ledger 接进 Financial 雷达轴。**节点 ③**。
- `0011-input-axis-insight-promotion` —— 让 Input capture 经 insight 晋升后上雷达。**节点 ③**。

**🧰 框架杂务(与产品主线正交,不在闭环上)**
- `0004-adoption-observability` —— harness-mini 自身的易用性工作;PR C/D 已被 harness
  0.6.0 升级上游交付,仅剩 PR B(walkthrough + demo)。**不阻塞产品。**

> 诊断:此前 active 棋盘上摆的全是"Financial 支线 + 框架杂务",主线故事反而沉在
> `completed/` 且**从未被一次端到端 dogfood 跑通验证闭合**——所以会感觉"没有线路、没有闭环"。

---

## 5. 当前前沿(2026-06-04 dogfood 之后)

**✅ 已做:端到端 dogfood 验证。** 隔离环境(throwaway `$HOME`,:3010,不碰真实 DB)
跑通 capture → 分类 Event → 五轴雷达 → Review Gate → 完成 → 回写 ENERGY event。
**闭环成立、Review Gate 是硬的**(缺 energy / 缺 agent_cost_decision 都 400)。dogfood
的目的就是找断点——找到两个,已各开 slice:

1. **`0010` — Financial 轴接 agent-cost ledger(最高价值)**:把 ledger 的 period spend
   接进雷达 Financial 轴(signed net rev−spend,按 v0.1.0 §3),让 0005/0006/0007 的成果
   在 Cockpit 可见。当前 $12.50 spend 只进 Review 汇总、不上雷达。

2. **`0011` — Input 轴的 insight 晋升**:让普通 capture 之后 Input 轴非零(INBOX→ACTIVE→
   event 路径在 UI 可达,或定义 INBOX 计入规则)。

**仍待收口:Financial 故事的生命周期。** 0005+0006+0007 代码全绿但从未过线:跑
`evaluate`(阻塞早已过期)→ 补 0007 浏览器 smoke → `checkpoint` → `done`。与 0010 互补——
**先收口(证明已建的是对的),再 0010(把它接上雷达)**。收口前抵制继续扩 provider
(five-step:先删)。

---

## 6. 反蔓延规则(anti-sprawl)

每开一个新故事,上来先回答:**"它服务闭环的哪一节点(①–⑤)或哪一根轴?"**
答不上来的,先按 five-step 第一步删掉,而不是优化或自动化它。agent-cost 的教训:一个
"节点 ④ 的输入"膨胀成了三段迷你产品,却始终没闭合——主线因此被淹没。
