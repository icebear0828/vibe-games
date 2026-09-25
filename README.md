# 🎮 Vibe Games Arcade

> ⚡ **All games in this repository were one-shot generated using Claude Opus 5.5 with single-sentence prompts (Vibe Coding).**
>
> 本仓库收录的所有游戏作品均为使用 **Claude Opus 5.5** 进行 **一句话 Prompt 单次生成 (One-Shot Vibe Coding)** 的实验成果。

---

## 🕹️ 在线试玩链接 / Live Demo Links

> 所有游戏均已通过 GitHub Pages 自动化部署，纯前端零后端依赖，点击即玩：

- 🎪 **游戏大厅总入口（Arcade Portal）**：  
  👉 **[https://icebear0828.github.io/vibe-games/](https://icebear0828.github.io/vibe-games/)**

| # | 游戏项目 | 原始 Prompt | 在线试玩链接 (点击直接进入) |
|---|---|---|---|
| 1 | ⚔️ **[英雄联盟峡谷仿真](./realistic-league-of-legends-simulation)** | `尽可能利用你的现有能力复刻游戏LOL` | 🔗 **[https://icebear0828.github.io/vibe-games/lol/](https://icebear0828.github.io/vibe-games/lol/)** |
| 2 | ⛏️ **[我的世界 3D 沙盒](./realistic-minecraft-recreation-project)** | `尽可能利用你的现有能力复刻Minecraft` | 🔗 **[https://icebear0828.github.io/vibe-games/minecraft/](https://icebear0828.github.io/vibe-games/minecraft/)** |
| 3 | 🌻 **[植物大战僵尸](./recreate-plants-vs-zombies)** | `尽可能利用你的现有能力复刻游戏PVZ` | 🔗 **[https://icebear0828.github.io/vibe-games/pvz/](https://icebear0828.github.io/vibe-games/pvz/)** |
| 4 | 🃏 **[杀戮尖塔肉鸽卡牌](./slay-the-spire-clone)** | `尽可能利用你的现有能力复刻杀戮尖塔` | 🔗 **[https://icebear0828.github.io/vibe-games/sts/](https://icebear0828.github.io/vibe-games/sts/)** |

---

## 📖 Games Overview / 游戏详细介绍

| # | Game / 项目名称 | Description / 简介 | Stack / 技术栈 |
|---|---|---|---|
| 1 | **[realistic-league-of-legends-simulation](./realistic-league-of-legends-simulation)** | 英雄联盟召唤师峡谷仿真模拟，包含防御塔仇恨、三路兵线推进、小兵与英雄 AI、A* 寻路和技能系统。 | React 19 + Vite + Tailwind CSS + Canvas |
| 2 | **[realistic-minecraft-recreation-project](./realistic-minecraft-recreation-project)** | 我的世界 3D 体素沙盒复刻，包含程序化地形生成（Perlin Noise）、方块破坏/放置、第一人称视角控制与物理碰撞。 | React 19 + Three.js + Vite + Tailwind CSS |
| 3 | **[recreate-plants-vs-zombies](./recreate-plants-vs-zombies)** | 植物大战僵尸复刻，包含图鉴（Almanac）、种植网格、阳光经济系统、植物攻击动画与波次僵尸推进。 | React 19 + Vite + Tailwind CSS + HTML5 Canvas |
| 4 | **[slay-the-spire-clone](./slay-the-spire-clone)** | 杀戮尖塔卡牌肉鸽复刻，包含地图路线选择、抽牌打牌出牌机制、遗物系统、状态与敌人意图系统。 | React 19 + Vite + Tailwind CSS + WebP Assets |

---

## ⚡ Highlights / 项目特色

- **100% One-Shot Prompted**: 核心玩法、状态机、战斗计算与渲染逻辑全部由 Claude Opus 5.5 单轮生成完成。
- **Zero-Backend Pure Client**: 纯前端驱动，基于 Vite + SingleFile 打包，零后端依赖，随时随地离线/在线秒开。
- **Responsive & Portable**: 支持现代浏览器直接运行，可一键部署至 GitHub Pages、Vercel 或 Cloudflare Pages。

---

## 🛠️ Local Development / 本地运行

### 前置环境
- Node.js >= 18
- npm / pnpm

### 启动指定游戏
```bash
# 1. 英雄联盟模拟
cd realistic-league-of-legends-simulation
npm install
npm run dev

# 2. 我的世界 3D 沙盒
cd realistic-minecraft-recreation-project
npm install
npm run dev

# 3. 植物大战僵尸
cd recreate-plants-vs-zombies
npm install
npm run dev

# 4. 杀戮尖塔
cd slay-the-spire-clone
npm install
npm run dev
```

---

## 🌐 Deployment / 部署说明
本项目配置了 GitHub Actions 自动化工作流。每次向 `main` 分支提交代码，云端将自动构建并将 4 个游戏打包发布至 GitHub Pages。

---

## 📜 License
MIT License. Created via AI-assisted Vibe Coding.
