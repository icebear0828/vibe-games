#  Vibe Games Arcade

>  **All games in this repository were one-shot generated using Claude Opus 5.5 with single-sentence prompts (Vibe Coding).**
>
> 本仓库收录的所有游戏作品均为使用 **Claude Opus 5.5** 进行 **一句话 Prompt 单次生成 (One-Shot Vibe Coding)** 的实验成果。

---

##  Games Overview / 游戏列表

| # | Game / 项目名称 | Description / 简介 | 提示词 | Demo Path |
|---|---|---|---|---|
| 1 | **[realistic-league-of-legends-simulation](./realistic-league-of-legends-simulation)** | 英雄联盟召唤师峡谷仿真模拟，包含防御塔、兵线、小兵与英雄 AI、A* 寻路和技能系统。 | 尽可能利用你的现有能力复刻游戏LOL | `/lol/` |
| 2 | **[realistic-minecraft-recreation-project](./realistic-minecraft-recreation-project)** | 我的世界 3D 体素沙盒复刻，包含程序化地形生成（Perlin Noise）、方块破坏/放置、第一人称视角控制与物理碰撞。 | 尽可能利用你的现有能力复刻Minecraft | `/minecraft/` |
| 3 | **[recreate-plants-vs-zombies](./recreate-plants-vs-zombies)** | 植物大战僵尸复刻，包含图鉴（Almanac）、种植网格、阳光经济系统、植物攻击动画与波次僵尸推进。 | 尽可能利用你的现有能力复刻游戏PVZ | `/pvz/` |
| 4 | **[slay-the-spire-clone](./slay-the-spire-clone)** | 杀戮尖塔卡牌肉鸽复刻，包含地图路线选择、抽牌打牌出牌机制、遗物系统、状态与敌人意图系统。 | 尽可能利用你的现有能力复刻杀戮尖塔 | `/sts/` |

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
本项目配置支持单仓 GitHub Pages 自动化发布。当推送至主分支后，GitHub Actions 自动构建并将各游戏集成至聚合门户中进行公开访问。

---

## 📜 License
MIT License. Created via AI-assisted Vibe Coding.
