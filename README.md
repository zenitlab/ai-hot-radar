# AI 热点监控工具

> 作者：[程序员鱼皮](https://yuyuanweb.feishu.cn/wiki/Abldw5WkjidySxkKxU2cQdAtnah)
>
> 本项目为教学项目，提供完整视频教程 + 文字教程 + 简历写法 + 面试题解 + 答疑服务，帮你提升项目能力，给简历增加亮点！
>
> ⭐️ 加入项目系列学习：[加入编程导航](https://www.codefather.cn/vip)



## 一、项目介绍

这是一套以 **AI 编程实战** 为核心的项目教程，基于 Express 5 + React 19 + OpenRouter + Socket.io，用 AI 编程的方式从 0 到 1 开发一个《AI 热点监控工具》，带你亲身体验 AI Vibe Coding 的完整工作流，学会用 AI 快速做出实用的提效工具！

📺 项目介绍视频，快速查看成品效果：https://bilibili.com/video/BV1g8d8B6ENk

![](https://pic.yupi.icu/1/image-20260304102630302.png)

输入要监控的关键词，系统自动从 Twitter、Bing、HackerNews、搜狗、B 站等 **8+** 个信息源聚合抓取内容，利用 AI 进行真假识别和相关性分析，并通过 WebSocket 实时推送和邮件通知用户。此外，还将热点监控能力封装为 **Agent Skills 技能包**，让 Cursor、VSCode Copilot、Claude Code 等 AI 编程工具也能直接使用。



### 为什么做这个项目？

鱼皮作为 AI 编程博主，要利用工具第一时间自动发现最新的热点（比如 AI 大模型的更新），并且及时给我发送通知，让我能够走在吃瓜第一线。

既然如此，**不如做一个更通用的工具**。

这就是 AI 热点监控工具的起点：让 AI 帮你盯热点，第一时间获取优质信息！

![](https://pic.yupi.icu/1/AI%E7%83%AD%E7%82%B9%E7%9B%91%E6%8E%A7%E5%AF%B9%E8%AF%9D%E6%A1%86.jpg)



### 6 大核心能力

1）配置监控关键词，支持激活 / 暂停。

![](https://pic.yupi.icu/1/image-20260304102804249.png)



2）AI 自动从 8+ 数据源抓取和分析热点，利用 AI 进行查询扩展、真假识别、相关性分析和智能摘要。

![](https://pic.yupi.icu/1/image-20260304103025682.png)



3）多维度筛选和排序，按来源、重要性、时间范围筛选，按热度、相关性、时间排序。

![](https://pic.yupi.icu/1/image-20260304103219366.png)



4）全网搜索，输入关键词从多个数据源聚合搜索。

![](https://pic.yupi.icu/1/image-20260304103824666.png)



5）实时通知，WebSocket 实时推送 + 邮件通知。

![](https://pic.yupi.icu/1/image-20260304104139285.png)



6）Agent Skills 技能包，安装后在 Cursor、VSCode Copilot、Claude Code 中都能直接使用。

![](https://pic.yupi.icu/1/1772099941189-4fb78679-12ac-4b92-a7b4-b5b4645b09d4.png)



## 二、项目优势

本项目选题新颖，紧跟 AI 编程时代，以 **实用工具开发** 为导向，区别于增删改查的烂大街项目。项目内容精炼，**不到一周就能学完**，带你掌握 AI 编程的完整工作流，给你的简历和求职大幅增加竞争力！

技术丰富，覆盖 AI 编程全链路：

![](https://pic.yupi.icu/1/image-20260304101227060.png)

从这个项目中你可以学到：

- 如何用 AI 编程从 0 到 1 开发一个完整的工具？
- 如何安装和使用 MCP 增强 AI 能力？
- 如何安装和使用 Agent Skills 提升 AI 编程质量？
- 如何从多个信息源（Twitter、Bing、HN、B 站等）聚合抓取内容？
- 如何通过 OpenRouter 接入 AI 大模型，实现智能内容审核？
- 如何实现查询扩展（Query Expansion），提高信息检索的召回率？
- 如何基于 Socket.io 实现 WebSocket 实时推送？
- 如何使用 Aceternity UI 打造炫酷的科技感前端界面？
- 如何开发标准化的 Agent Skills 技能包，并在多种 AI 工具中验证？
- 如何在 AI 编程中进行人工确认、版本控制和迭代优化？



### 鱼皮系列项目优势

鱼皮的原创项目以 **实战** 为主，用 **全程直播** 的方式 **从 0 到 1** 带做，从需求分析、技术选型、项目设计、项目初始化、Demo 编写、前后端开发实现、项目优化、部署上线等，每个环节我都 **从理论到实践** 给大家讲的明明白白、每个细节都不放过！

比起看网上的教程学习，鱼皮项目系列的优势：从学知识 => 实践项目 => 复习笔记 => 项目答疑 => 简历写法 => 面试题解的一条龙服务

![](https://pic.yupi.icu/1/%E9%B1%BC%E7%9A%AE%E9%A1%B9%E7%9B%AE%E5%AE%9E%E6%88%98%E7%9A%84%E4%BC%98%E5%8A%BF%E5%A4%A7.jpeg)

编程导航已有 **20+ 套项目教程！** 每个项目的学习重点不同，几乎全都是前端 + 后端的 **全栈项目**，也有大量 AI 应用开发项目。

详细请见：[https://codefather.cn/course](https://www.codefather.cn/course)（在该页面右侧有教程推荐和学习建议）

往期项目介绍视频：[https://bilibili.com/video/BV1YvmbYbEgS](https://www.bilibili.com/video/BV1YvmbYbEgS/)

鱼皮的项目帮很多同学拿到了大厂高薪 Offer：

![](https://pic.yupi.icu/1/%E7%BC%96%E7%A8%8B%E5%AF%BC%E8%88%AA2026%20offer%E6%8A%A5%E5%96%9C.png)



## 三、更多介绍

功能模块：

![](https://pic.yupi.icu/1/image-20260304101313199.png)

架构设计：

![](https://pic.yupi.icu/1/image-20260304101440202.png)



## 四、快速运行

> 详细的保姆级教程请参考 [本地运行指南](docs/LOCAL_SETUP.md)

### 前置条件

- Node.js ≥ 18（推荐 20 LTS）
- 一个 [OpenRouter API Key](https://openrouter.ai/settings/keys)（必需，用于 AI 分析）

### 1. 克隆并安装依赖

```bash
git clone https://github.com/liyupi/ai-hot-radar.git
cd ai-hot-radar

# 后端
cd server
npm install
npx prisma generate
npx prisma db push

# 前端
cd ../client
npm install
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，至少填入 OpenRouter API Key：

```bash
OPENROUTER_API_KEY=sk-or-v1-你的key
# Twitter API Key（可选）
TWITTER_API_KEY=你的key
```

### 3. 启动服务（两个终端）

```bash
# 终端 1：启动后端（端口 3001）
cd server && npm run dev

# 终端 2：启动前端（端口 5173）
cd client && npm run dev
```

访问 **http://localhost:5173** ，输入关键词即可开始监控热点 🔥

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| 数据库管理 | `cd server && npx prisma studio`（可选） |

更多细节请查看 [保姆级本地运行指南](docs/LOCAL_SETUP.md)。



## 加入项目学习

编程导航已有 **20+ 套项目教程**！每个项目的学习重点不同，几乎全都是前端 + 后端的 **全栈** 项目，也有大量 AI 应用开发项目。

![](https://pic.yupi.icu/1/%25E9%25A1%25B9%25E7%259B%25AE%25E6%2595%2599%25E7%25A8%258B.png)

欢迎加入 [编程导航](https://www.codefather.cn/vip)，加入后不仅可以全程跟学本项目，往期 **20+ 套原创项目教程** 也都可以无限回看。还能享受更多原创技术资料、学习和求职指导、上百场面试回放视频，开启你的编程起飞之旅~

🧧 助力新项目学习，给大家发放 **限时编程导航优惠券**，扫码即可领券加入。加入三天内不满意可全额退款，欢迎加入体验，名额有限，速来学习！

<img width="404" alt="image" src="https://github.com/user-attachments/assets/56411098-b60e-4267-8ba2-4ebc5d416afc" />

1 天不到 1 块钱，绝对是对自己最值的投资！成为编程导航会员后，可以解锁 20 多套项目的教程和资料，PC 网站和 APP 都可以学习，如图：

![](https://pic.yupi.icu/1/image-20250120113756426-20250422160856746.png)
