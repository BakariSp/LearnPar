# Zero AI - 个性化学习平台 | Personalized Learning Platform

Zero AI is a lightweight AI learning guide designed to help users go from 0 to 0.5 in any unfamiliar field. It provides a personalized, gamified learning experience to break down barriers to knowledge and make learning accessible and engaging.

Zero AI 是一个轻量级的AI学习指南，旨在帮助用户在任何陌生领域从0到0.5的进阶。它提供个性化的、游戏化的学习体验，打破知识壁垒，让学习变得轻松有趣。

This repository contains the frontend application built with [Next.js](https://nextjs.org), React, TypeScript, and Tailwind CSS.

本仓库包含使用 [Next.js](https://nextjs.org)、React、TypeScript 和 Tailwind CSS 构建的前端应用程序。

## Our Vision | 我们的愿景

At Zero AI, we believe that the beginning of every journey is the most important step. Our mission is to empower curious minds to explore new fields effortlessly by providing a personalized, gamified learning experience. We envision a future where learning is lightweight, joyful, and truly accessible for everyone starting from zero.

在 Zero AI，我们相信每个旅程的开始都是最重要的一步。我们的使命是通过提供个性化的、游戏化的学习体验，让好奇的头脑能够轻松探索新领域。我们期待一个学习变得轻量、愉悦，并且真正对每个从零开始的人开放的未来。

## Features | 功能特点

*   **Keyword Cards | 关键词卡片:** Bite-sized units of knowledge with clear explanations, examples, and resources.
    包含清晰解释、示例和资源的微型知识单元。

*   **Personalized Learning Paths | 个性化学习路径:** AI-generated learning routes tailored to user interests and goals.
    根据用户兴趣和目标定制的AI生成学习路线。

*   **Gamified Feedback & Achievement System | 游戏化反馈与成就系统:** Visualize progress, collect milestones, and build a structured knowledge map.
    可视化进度，收集里程碑，构建结构化知识图谱。

*   **AI-Powered Content Generation | AI驱动的内容生成:** Learning paths and cards are generated dynamically using AI agents.
    使用AI代理动态生成学习路径和卡片。

*   **Conversational Path Building | 对话式路径构建:** Users can interact with an AI dialogue agent to build their learning plan.
    用户可以与AI对话代理交互来构建学习计划。

## Tech Stack | 技术栈

*   **Frontend | 前端:** React, Next.js (App Router), TypeScript, Tailwind CSS
*   **State Management | 状态管理:** React Context API (potentially Zustand/Redux for global state if needed)
*   **Backend | 后端:** FastAPI (Python) - **Note | 注意:** The backend runs as a separate service. See [Backend Setup](#backend-setup).
*   **Styling | 样式:** Tailwind CSS, CSS Modules
*   **API Communication | API通信:** Axios, Fetch API

## Getting Started | 开始使用

### Prerequisites | 前置要求

*   Node.js (Version specified in `package.json` or latest LTS)
*   npm, yarn, pnpm, or bun
*   A running instance of the [Zero AI Backend](link-to-backend-repo-if-available) service.

### Frontend Setup | 前端设置

1.  **Clone the repository | 克隆仓库:**
    ```bash
    git clone <your-repo-url>
    cd learn-par
    ```

2.  **Install dependencies | 安装依赖:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Configure Environment Variables | 配置环境变量:**
    *   Create a `.env.local` file based on `.env.example` (if one exists) and fill in the necessary values.
    基于 `.env.example`（如果存在）创建 `.env.local` 文件并填写必要的值。

4.  **Run the development server | 运行开发服务器:**
    ```bash
    # With local backend | 使用本地后端
    npm run dev:local-api
    
    # OR with remote backend | 或使用远程后端
    npm run dev:remote-api
    
    # OR default development mode | 或默认开发模式
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
    在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

### Local Development with Remote Backend

We've added a special development mode that allows you to connect to the remote API while running the frontend locally:

1. The `dev:remote-api` script will:
   - Connect to the production/staging backend API
   - Prevent redirects to the production frontend
   - Allow you to debug your local frontend with real data

2. See [local-development-with-remote-api.md](./local-development-with-remote-api.md) for detailed instructions.

### Backend Setup

The frontend relies on the Zero AI backend API.

1.  Ensure the backend FastAPI server is running. By default, the frontend expects the backend API to be accessible.
2.  This Next.js application uses a proxy rewrite rule defined in `next.config.ts` to forward requests from `/api/*` to the backend service (currently configured for an Azure deployment). If running the backend locally, you might need to adjust the `destination` URL in `next.config.ts` or configure CORS on the backend accordingly.

    ```typescript:learn-par/next.config.ts
    startLine: 4
    endLine: 14
    ```

## API Documentation

The interaction between the frontend and backend is documented in the `/doc` directory:

*   **Learning Paths:** `doc/features/learning/learning-path.md`, `doc/features/learning/course-section-cards.md`
*   **Cards:** `doc/features/learning/cards.md`
*   **Authentication:** `doc/features/auth/login.md`
*   **Background Tasks:** `doc/features/tasks/api.md`
*   **Dialogue Agent:** `doc/features/ai-chat/planner.md`
*   **Chat Generation:** `doc/features/ai-chat/generation.md`

## Code Generation & Styling

*   Frontend development follows guidelines outlined in `doc/guides/development/frontend-rules.md`.
*   Visual styling guidelines are available in `doc/guides/development/visual-guide.md`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. Remember to configure the backend API URL environment variable for your Vercel deployment.

## API Endpoints

### Learning Path Endpoints

The application uses different API endpoints depending on the context:

1. **My Paths Page** - Uses `/api/users/me/learning-paths/{id}` 
   - Returns basic structure with progress tracking
   - Used for the path list and summary view

2. **Learning Path Detail Page** - Uses `/api/users/me/learning-paths/{id}/full`
   - Returns complete nested structure with all courses, sections, and cards
   - Includes progress information for the user
   - Used for detailed view with card content

3. **Section Cards** - Uses `/api/users/me/sections/{id}` 
   - Fetches detailed card information for a specific section
   - Used when expanding a section to view its cards

For more details on API endpoints, see the documentation in `doc/learning_path.md`.

# LearnPar Project Documentation

## Project Overview
LearnPar is a Next.js-based learning platform that provides a comprehensive learning experience with features like AI chat, course management, and internationalization support.

## Project Structure | 项目结构

### Directory Structure Overview | 目录结构概述

#### 1. App Router (`app/[locale]`) | 应用路由
- **Purpose | 目的**: Defines URL routes and page rendering | 定义URL路由和页面渲染
- **Responsibilities | 职责**:
  - URL path definitions | URL路径定义
  - Page layouts | 页面布局
  - Page-level data fetching | 页面级数据获取
  - Route parameters handling | 路由参数处理
- **Example | 示例**:
  ```
  /dashboard/profile -> app/[locale]/dashboard/profile/page.tsx
  /courses/[id] -> app/[locale]/courses/[id]/page.tsx
  ```

#### 2. Components (`components/`) | 组件
- **Purpose | 目的**: Shared UI components following atomic design | 遵循原子设计的共享UI组件
- **Structure | 结构**:
  - `atoms/`: Basic building blocks (buttons, inputs, etc.) | 基础构建块（按钮、输入框等）
  - `molecules/`: Combinations of atoms (forms, cards, etc.) | 原子组件的组合（表单、卡片等）
  - `organisms/`: Complex UI components (header, sidebar, etc.) | 复杂UI组件（头部、侧边栏等）

#### 3. Features (`features/`) | 功能模块
- **Purpose | 目的**: Business logic and feature-specific components | 业务逻辑和特定功能组件
- **Structure | 结构**:
  ```
  features/
  ├── auth/          # Authentication feature | 认证功能
  ├── dashboard/     # Dashboard feature | 仪表板功能
  ├── learning/      # Learning feature | 学习功能
  ├── ai-chat/       # AI Chat feature | AI聊天功能
  └── calendar/      # Calendar feature | 日历功能
  ```
- **Each Feature Contains | 每个功能包含**:
  - `components/`: Feature-specific components | 功能特定组件
  - `hooks/`: Custom hooks | 自定义钩子
  - `services/`: Business logic | 业务逻辑

#### 4. Services (`services/`) | 服务
- **Purpose | 目的**: Core services and API integration | 核心服务和API集成
- **Structure | 结构**:
  ```
  services/
  ├── api/          # API client and requests | API客户端和请求
  ├── auth/         # Authentication service | 认证服务
  ├── supabase/     # Supabase service | Supabase服务
  └── user/         # User service | 用户服务
  ```

#### 5. Libraries (`lib/`) | 库
- **Purpose | 目的**: Core utilities and helpers | 核心工具和辅助函数
- **Structure | 结构**:
  ```
  lib/
  ├── utils/        # Utility functions | 工具函数
  ├── constants/    # Constants | 常量
  └── helpers/      # Helper functions | 辅助函数
  ```

#### 6. Types (`types/`) | 类型
- **Purpose | 目的**: TypeScript type definitions | TypeScript类型定义
- **Structure | 结构**:
  ```
  types/
  ├── api/          # API types | API类型
  ├── models/       # Model types | 模型类型
  ├── components/   # Component types | 组件类型
  └── common.ts     # Common types | 通用类型
  ```

#### 7. Styles (`styles/`) | 样式
- **Purpose | 目的**: Global styles and theme management | 全局样式和主题管理
- **Structure | 结构**:
  ```
  styles/
  ├── base/         # Base styles | 基础样式
  ├── components/   # Component styles | 组件样式
  ├── themes/       # Theme styles | 主题样式
  └── utils/        # Style utilities | 样式工具
  ```

#### 8. Internationalization (`i18n/`) | 国际化
- **Purpose | 目的**: Translation and localization management | 翻译和本地化管理
- **Structure | 结构**:
  ```
  i18n/
  ├── locales/      # Translation files | 翻译文件
  ├── config/       # i18n configuration | i18n配置
  ├── hooks/        # i18n hooks | i18n钩子
  └── utils/        # i18n utilities | i18n工具
  ```

#### 9. Configuration (`config/`) | 配置
- **Purpose | 目的**: Application configuration files | 应用程序配置文件
- **Structure | 结构**:
  ```
  config/
  ├── next/         # Next.js configuration | Next.js配置
  ├── eslint/       # ESLint configuration | ESLint配置
  ├── typescript/   # TypeScript configuration | TypeScript配置
  └── tailwind/     # Tailwind configuration | Tailwind配置
  ```

#### 10. Documentation (`doc/`) | 文档
- **Purpose | 目的**: Project documentation and guides | 项目文档和指南
- **Structure | 结构**:
  ```
  doc/
  ├── guides/       # Development guides | 开发指南
  ├── api/          # API documentation | API文档
  └── features/     # Feature documentation | 功能文档
  ```

### Key Improvements | 主要改进

1. **Clear Separation of Concerns | 清晰的关注点分离**
   - UI components separated from business logic | UI组件与业务逻辑分离
   - Feature-specific code isolated in feature modules | 特定功能代码隔离在功能模块中
   - Core services centralized in services directory | 核心服务集中在服务目录中

2. **Improved Maintainability | 改进的可维护性**
   - Consistent directory structure across features | 功能模块间一致的目录结构
   - Clear organization of configuration files | 配置文件的清晰组织
   - Well-documented code structure | 良好的代码结构文档

3. **Better Scalability | 更好的可扩展性**
   - Modular feature organization | 模块化的功能组织
   - Reusable components and utilities | 可复用的组件和工具
   - Flexible service architecture | 灵活的服务架构

4. **Enhanced Development Experience | 增强的开发体验**
   - Clear file location conventions | 清晰的文件位置约定
   - Organized documentation | 组织良好的文档
   - Consistent coding patterns | 一致的编码模式

### Optimized Directory Structure | 优化后的目录结构
```
├── app/                              # Next.js app directory | Next.js应用目录
│   ├── [locale]/                    # Internationalized routes | 国际化路由
│   │   ├── home/                  # Home page | 首页
│   │   ├── landing/             # Landing page | 着陆页
│   │   ├── dashboard/            # Dashboard page | 仪表板页面
│   │   │   ├── overview/       # Dashboard overview | 仪表板概览
│   │   │   ├── profile/       # User profile | 用户资料
│   │   │   │   ├── settings/ # Profile settings | 个人设置
│   │   │   │   └── progress/ # Learning progress | 学习进度
│   │   │   ├── learning-paths/ # Learning paths | 学习路径
│   │   │   └── courses/      # Enrolled courses | 已选课程
│   │   ├── learning-paths/         # Learning path pages | 学习路径页面
│   │   │   ├── [id]/            # Learning path detail | 学习路径详情
│   │   │   └── create/         # Create learning path | 创建学习路径
│   │   ├── courses/               # Course pages | 课程页面
│   │   │   ├── [id]/          # Course detail | 课程详情
│   │   │   └── explore/      # Course exploration | 课程探索
│   │   ├── calendar/            # Calendar pages | 日历页面
│   │   │   ├── schedule/      # Schedule view | 日程视图
│   │   │   └── events/       # Events view | 事件视图
│   │   └── ai-chat/           # AI Chat pages | AI聊天页面
│   │       ├── chat/         # Chat interface | 聊天界面
│   │       └── history/      # Chat history | 聊天历史
│   ├── api/                        # API routes | API路由
│   │   ├── auth/                 # Authentication endpoints | 认证端点
│   │   ├── dashboard/          # Dashboard endpoints | 仪表板端点
│   │   ├── learning-paths/      # Learning path endpoints | 学习路径端点
│   │   ├── courses/            # Course endpoints | 课程端点
│   │   ├── ai-chat/          # AI Chat endpoints | AI聊天端点
│   │   └── calendar/        # Calendar endpoints | 日历端点
│   ├── auth/                       # Authentication pages | 认证页面
│   │   ├── login/              # Login page | 登录页面
│   │   └── register/         # Register page | 注册页面
│   └── layout.tsx                  # Root layout | 根布局
│
├── components/                     # Shared UI components | 共享UI组件
│   ├── atoms/                    # Atomic components | 原子组件
│   │   ├── Button/             # Button components | 按钮组件
│   │   ├── Input/             # Input components | 输入组件
│   │   ├── Typography/       # Typography components | 排版组件
│   │   └── Icons/          # Icon components | 图标组件
│   ├── molecules/               # Molecular components | 分子组件
│   │   ├── Card/             # Card components | 卡片组件
│   │   ├── Form/            # Form components | 表单组件
│   │   ├── Modal/          # Modal components | 模态框组件
│   │   └── ProductInfoPopup/ # Product info popup | 产品信息弹窗
│   └── organisms/              # Organism components | 有机组件
│       ├── Header/          # Header components | 头部组件
│       ├── Sidebar/        # Sidebar components | 侧边栏组件
│       └── Footer/        # Footer components | 底部组件
│
├── features/                      # Feature modules | 功能模块
│   ├── auth/                    # Authentication feature | 认证功能
│   │   ├── components/        # Auth components | 认证组件
│   │   │   ├── LoginModal/  # Login modal | 登录模态框
│   │   │   └── AuthHashHandler/ # Auth hash handler | 认证哈希处理
│   │   ├── hooks/           # Auth hooks | 认证钩子
│   │   └── services/       # Auth services | 认证服务
│   ├── dashboard/              # Dashboard feature | 仪表板功能
│   │   ├── components/      # Dashboard components | 仪表板组件
│   │   │   ├── Profile/   # Profile components | 资料组件
│   │   │   ├── Stats/    # Stats components | 统计组件
│   │   │   └── Overview/ # Overview components | 概览组件
│   │   ├── hooks/         # Dashboard hooks | 仪表板钩子
│   │   └── services/     # Dashboard services | 仪表板服务
│   ├── learning/               # Learning feature | 学习功能
│   │   ├── components/     # Learning components | 学习组件
│   │   ├── hooks/        # Learning hooks | 学习钩子
│   │   └── services/    # Learning services | 学习服务
│   ├── ai-chat/              # AI Chat feature | AI聊天功能
│   │   ├── components/    # AI Chat components | AI聊天组件
│   │   ├── hooks/       # AI Chat hooks | AI聊天钩子
│   │   └── services/  # AI Chat services | AI聊天服务
│   └── calendar/             # Calendar feature | 日历功能
│       ├── components/   # Calendar components | 日历组件
│       ├── hooks/      # Calendar hooks | 日历钩子
│       └── services/ # Calendar services | 日历服务
│
├── services/                        # Core services | 核心服务
│   ├── api/                    # API client and requests | API客户端和请求
│   │   ├── client.ts         # API client | API客户端
│   │   ├── endpoints.ts     # API endpoints | API端点
│   │   └── types.ts        # API types | API类型
│   ├── auth/                  # Authentication service | 认证服务
│   ├── supabase/             # Supabase service | Supabase服务
│   └── user/                 # User service | 用户服务
│
├── lib/                           # Core libraries | 核心库
│   ├── utils/                  # Utility functions | 工具函数
│   │   ├── date.ts          # Date utilities | 日期工具
│   │   ├── format.ts       # Format utilities | 格式化工具
│   │   └── validation.ts  # Validation utilities | 验证工具
│   ├── constants/             # Constants | 常量
│   └── helpers/               # Helper functions | 辅助函数
│
├── types/                          # TypeScript types | TypeScript类型
│   ├── api/                    # API types | API类型
│   ├── models/                # Model types | 模型类型
│   ├── components/           # Component types | 组件类型
│   └── common.ts            # Common types | 通用类型
│
├── styles/                         # Global styles | 全局样式
│   ├── base/                  # Base styles | 基础样式
│   ├── components/           # Component styles | 组件样式
│   ├── themes/             # Theme styles | 主题样式
│   └── utils/             # Style utilities | 样式工具
│
├── i18n/                           # Internationalization | 国际化
│   ├── locales/                  # Translation files | 翻译文件
│   │   ├── en/                  # English translations | 英文翻译
│   │   │   ├── common.json     # Common translations | 通用翻译
│   │   │   ├── dashboard.json  # Dashboard translations | 仪表板翻译
│   │   │   ├── courses.json   # Course translations | 课程翻译
│   │   │   └── auth.json     # Auth translations | 认证翻译
│   │   ├── zh/                  # Chinese translations | 中文翻译
│   │   │   ├── common.json     # Common translations | 通用翻译
│   │   │   ├── dashboard.json  # Dashboard translations | 仪表板翻译
│   │   │   ├── courses.json   # Course translations | 课程翻译
│   │   │   └── auth.json     # Auth translations | 认证翻译
│   │   └── ...                 # Other languages | 其他语言
│   ├── config/                 # i18n configuration | i18n配置
│   ├── hooks/                # i18n hooks | i18n钩子
│   └── utils/              # i18n utilities | i18n工具
│
├── config/                         # Configuration files | 配置文件
│   ├── next/                  # Next.js configuration | Next.js配置
│   ├── eslint/               # ESLint configuration | ESLint配置
│   ├── typescript/          # TypeScript configuration | TypeScript配置
│   └── tailwind/           # Tailwind configuration | Tailwind配置
│
├── doc/                             # Documentation | 文档
│   ├── guides/                  # Development guides | 开发指南
│   │   ├── setup/            # Setup guides | 设置指南
│   │   ├── development/     # Development guides | 开发指南
│   │   └── deployment/     # Deployment guides | 部署指南
│   ├── api/                    # API documentation | API文档
│   │   ├── auth/           # Auth API docs | 认证API文档
│   │   ├── learning/      # Learning API docs | 学习API文档
│   │   └── user/         # User API docs | 用户API文档
│   └── features/               # Feature documentation | 功能文档
│       ├── auth/           # Auth feature docs | 认证功能文档
│       ├── learning/      # Learning feature docs | 学习功能文档
│       └── ai-chat/      # AI Chat feature docs | AI聊天功能文档
│
├── public/                         # Static assets | 静态资源
│   ├── images/                  # Images | 图片
│   ├── fonts/                 # Fonts | 字体
│   └── locales/              # Locale files | 本地化文件
│
├── providers/                      # Context providers | 上下文提供者
│   ├── AuthProvider.tsx          # Auth provider | 认证提供者
│   ├── ThemeProvider.tsx        # Theme provider | 主题提供者
│   ├── LocalizationProvider.tsx # Localization provider | 本地化提供者
│   └── AiChatProvider.tsx      # AI Chat provider | AI聊天提供者
│
├── hooks/                         # Shared hooks | 共享钩子
│   ├── useAuth.ts               # Authentication hook | 认证钩子
│   ├── useLocalization.ts      # Localization hook | 本地化钩子
│   ├── useTheme.ts            # Theme hook | 主题钩子
│   └── useAiChat.ts          # AI Chat hook | AI聊天钩子
│
├── middleware.ts                    # Next.js middleware | Next.js中间件
└── .gitignore                      # Git ignore rules | Git忽略规则
```

## Optimization Directions | 优化方向

### 1. Frontend Performance | 前端性能
- **Bundle Size Optimization | 打包大小优化**
  - Implement code splitting for large components | 对大型组件实现代码分割
  - Use dynamic imports for routes | 对路由使用动态导入
  - Optimize third-party library imports | 优化第三方库导入
  - Implement tree shaking | 实现树摇优化

- **Rendering Performance | 渲染性能**
  - Implement React.memo for expensive components | 对性能消耗大的组件使用React.memo
  - Use useMemo and useCallback hooks | 使用useMemo和useCallback钩子
  - Optimize re-renders | 优化重渲染
  - Implement virtualization for long lists | 对长列表实现虚拟化

### 2. API and Data Management | API和数据管理
- **API Optimization | API优化**
  - Implement request batching | 实现请求批处理
  - Add request caching | 添加请求缓存
  - Implement request debouncing | 实现请求防抖
  - Add request retry mechanism | 添加请求重试机制

- **State Management | 状态管理**
  - Implement proper data normalization | 实现数据规范化
  - Add optimistic updates | 添加乐观更新
  - Implement proper error boundaries | 实现错误边界
  - Add loading states | 添加加载状态

### 3. User Experience | 用户体验
- **Loading Experience | 加载体验**
  - Add skeleton loading | 添加骨架屏加载
  - Implement progressive loading | 实现渐进式加载
  - Add loading indicators | 添加加载指示器
  - Implement preloading for critical resources | 实现关键资源预加载

- **Error Handling | 错误处理**
  - Implement global error handling | 实现全局错误处理
  - Add user-friendly error messages | 添加用户友好的错误信息
  - Implement error recovery mechanisms | 实现错误恢复机制
  - Add error logging and monitoring | 添加错误日志和监控

### 4. Code Quality | 代码质量
- **Type Safety | 类型安全**
  - Strengthen TypeScript types | 加强TypeScript类型
  - Add proper type guards | 添加类型守卫
  - Implement strict type checking | 实现严格类型检查
  - Add runtime type validation | 添加运行时类型验证

- **Testing Coverage | 测试覆盖**
  - Add unit tests for components | 添加组件单元测试
  - Implement integration tests | 实现集成测试
  - Add E2E tests for critical paths | 添加关键路径的端到端测试
  - Implement test automation | 实现测试自动化

### 5. Security | 安全性
- **Authentication | 认证**
  - Implement JWT refresh mechanism | 实现JWT刷新机制
  - Add session management | 添加会话管理
  - Implement proper token storage | 实现安全的令牌存储
  - Add multi-factor authentication | 添加多因素认证

- **Data Protection | 数据保护**
  - Implement proper data encryption | 实现数据加密
  - Add input sanitization | 添加输入净化
  - Implement rate limiting | 实现速率限制
  - Add security headers | 添加安全头

### 6. Internationalization | 国际化
- **i18n Optimization | 国际化优化**
  - Implement lazy loading for translations | 实现翻译懒加载
  - Add language detection | 添加语言检测
  - Implement RTL support | 实现RTL支持
  - Add number and date formatting | 添加数字和日期格式化

### 7. Accessibility | 可访问性
- **WCAG Compliance | WCAG合规**
  - Add proper ARIA labels | 添加ARIA标签
  - Implement keyboard navigation | 实现键盘导航
  - Add screen reader support | 添加屏幕阅读器支持
  - Implement focus management | 实现焦点管理

### 8. Monitoring and Analytics | 监控和分析
- **Performance Monitoring | 性能监控**
  - Implement performance metrics | 实现性能指标
  - Add error tracking | 添加错误跟踪
  - Implement user behavior analytics | 实现用户行为分析
  - Add real-time monitoring | 添加实时监控

### 9. Documentation | 文档
- **Code Documentation | 代码文档**
  - Add JSDoc comments | 添加JSDoc注释
  - Create component documentation | 创建组件文档
  - Add API documentation | 添加API文档
  - Create development guides | 创建开发指南

### 10. Development Workflow | 开发工作流
- **CI/CD Pipeline | CI/CD管道**
  - Implement automated testing | 实现自动化测试
  - Add automated deployment | 添加自动化部署
  - Implement code quality checks | 实现代码质量检查
  - Add performance regression testing | 添加性能回归测试

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Run development server:
```bash
npm run dev
```

## Contributing | 贡献
Please read our contributing guidelines before submitting pull requests.
在提交拉取请求之前，请阅读我们的贡献指南。

## License | 许可证
This project is licensed under the MIT License - see the LICENSE file for details.
本项目采用MIT许可证 - 详情请查看LICENSE文件。
