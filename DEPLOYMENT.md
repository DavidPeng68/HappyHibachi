# Family Friends Hibachi - Cloudflare 部署指南

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                           │
├─────────────────────────────────────────────────────────────┤
│  Pages (静态网站)  │  Workers (API)  │  KV (数据存储)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Resend (邮件)  │
                    └─────────────────┘
```

## 部署步骤

### 1. 准备工作

#### 1.1 注册账号
- [ ] [Cloudflare](https://dash.cloudflare.com/sign-up) - 托管和 API
- [ ] [Resend](https://resend.com/signup) - 邮件服务（免费 3000 封/月）

#### 1.2 获取 API Keys
- Resend API Key: https://resend.com/api-keys

---

### 2. Cloudflare Pages 部署

#### 2.1 通过 GitHub 连接（推荐）

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Workers & Pages** → **Create application** → **Pages**
4. 选择 **Connect to Git**
5. 授权并选择你的仓库
6. 配置构建设置：

| 设置项 | 值 |
|--------|-----|
| Framework preset | Create React App |
| Build command | `npm run build` |
| Build output directory | `build` |
| Root directory | `/` |

7. 点击 **Save and Deploy**

#### 2.2 通过 CLI 部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
npm run build

# 部署
wrangler pages deploy build --project-name=family-friends-hibachi
```

---

### 3. 配置环境变量

在 Cloudflare Dashboard → Workers & Pages → family-friends-hibachi → Settings → Environment variables

#### 3.1 Production 环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `RESEND_API_KEY` | `re_xxxxxx` | Resend API Key |
| `NOTIFICATION_EMAIL` | `familyfriendshibachi@gmail.com` | 接收预约通知的邮箱 |
| `ADMIN_PASSWORD` | `your_secure_password` | Admin 后台登录密码 |

#### 3.2 设置步骤

1. 进入项目设置 → Environment variables
2. 点击 **Add variable**
3. 选择 **Production** 环境
4. 输入变量名和值
5. 勾选 **Encrypt** 加密敏感数据
6. 点击 **Save**

#### 3.3 配置 KV Namespace (预约数据存储)

1. 进入 Cloudflare Dashboard → Workers & Pages → KV
2. 点击 **Create a namespace**
3. 名称填写: `family-friends-hibachi-bookings`
4. 点击 **Add**
5. 进入项目设置 → Functions → KV namespace bindings
6. 添加绑定:
   - Variable name: `BOOKINGS`
   - KV namespace: 选择刚创建的 `family-friends-hibachi-bookings`
7. 点击 **Save**

---

### 4. 配置自定义域名

#### 4.1 添加域名

1. 进入项目 → Custom domains
2. 点击 **Set up a custom domain**
3. 输入域名（如 `familyfriendshibachi.com`）
4. 按提示配置 DNS

#### 4.2 DNS 配置（如果域名在 Cloudflare）

| 类型 | 名称 | 内容 |
|------|------|------|
| CNAME | @ | family-friends-hibachi.pages.dev |
| CNAME | www | family-friends-hibachi.pages.dev |

#### 4.3 SSL 证书

Cloudflare 会自动颁发免费 SSL 证书，无需手动配置。

---

### 5. 验证部署

#### 5.1 检查网站

访问以下 URL 确认部署成功：

- 预览地址: `https://family-friends-hibachi.pages.dev`
- 自定义域名: `https://familyfriendshibachi.com`（配置后）

#### 5.2 测试 API

```bash
# 测试预约 API
curl -X POST https://family-friends-hibachi.pages.dev/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "date": "2024-12-25",
    "time": "evening",
    "guestCount": 15,
    "region": "california",
    "formType": "booking"
  }'
```

#### 5.3 测试 Admin 后台

1. 访问: `https://your-domain.com/admin`
2. 输入环境变量中设置的 `ADMIN_PASSWORD`
3. 登录后可以:
   - 查看所有预约/询价请求
   - 更新预约状态 (Pending → Confirmed → Completed)
   - 快速联系客户 (邮件/电话)

---

### 6. 常见问题

#### Q: 构建失败怎么办？

检查 Build logs，常见原因：
- Node.js 版本不匹配 → 在 Environment variables 添加 `NODE_VERSION=18`
- 依赖安装失败 → 删除 `package-lock.json` 重新生成

#### Q: API 返回 500 错误？

1. 检查环境变量是否正确设置
2. 查看 Workers 日志：Dashboard → Workers & Pages → 项目 → Logs

#### Q: 邮件收不到？

1. 检查 Resend API Key 是否有效
2. 检查 Resend 发送配额是否用完
3. 查看 Resend Dashboard 的发送日志

---

### 7. 更新部署

#### 自动部署（推荐）

推送到 `main` 分支会自动触发部署：

```bash
git add .
git commit -m "Update content"
git push origin main
```

#### 手动部署

```bash
npm run build
wrangler pages deploy build --project-name=family-friends-hibachi
```

---

### 8. 监控和日志

#### 8.1 查看访问统计

Dashboard → Workers & Pages → 项目 → Analytics

#### 8.2 查看 API 日志

Dashboard → Workers & Pages → 项目 → Logs → Real-time Logs

#### 8.3 设置告警（可选）

Dashboard → Notifications → Create → 选择事件类型

---

### 9. 成本总结

| 服务 | 免费额度 | 你的使用预估 | 费用 |
|------|---------|-------------|------|
| Cloudflare Pages | 无限带宽 | - | $0 |
| Cloudflare Workers | 10万请求/天 | <1000/天 | $0 |
| Resend 邮件 | 3000封/月 | <500/月 | $0 |
| 域名 | - | 1个 | ~$12/年 |
| **合计** | | | **~$12/年** |

---

## 快速命令参考

```bash
# 本地开发
npm start

# 构建
npm run build

# 类型检查
npm run type-check

# 部署到 Cloudflare
wrangler pages deploy build --project-name=family-friends-hibachi

# 查看部署状态
wrangler pages deployment list --project-name=family-friends-hibachi

# 查看 Workers 日志
wrangler pages deployment tail --project-name=family-friends-hibachi
```




## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                           │
├─────────────────────────────────────────────────────────────┤
│  Pages (静态网站)  │  Workers (API)  │  KV (数据存储)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Resend (邮件)  │
                    └─────────────────┘
```

## 部署步骤

### 1. 准备工作

#### 1.1 注册账号
- [ ] [Cloudflare](https://dash.cloudflare.com/sign-up) - 托管和 API
- [ ] [Resend](https://resend.com/signup) - 邮件服务（免费 3000 封/月）

#### 1.2 获取 API Keys
- Resend API Key: https://resend.com/api-keys

---

### 2. Cloudflare Pages 部署

#### 2.1 通过 GitHub 连接（推荐）

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 **Workers & Pages** → **Create application** → **Pages**
4. 选择 **Connect to Git**
5. 授权并选择你的仓库
6. 配置构建设置：

| 设置项 | 值 |
|--------|-----|
| Framework preset | Create React App |
| Build command | `npm run build` |
| Build output directory | `build` |
| Root directory | `/` |

7. 点击 **Save and Deploy**

#### 2.2 通过 CLI 部署

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 构建项目
npm run build

# 部署
wrangler pages deploy build --project-name=family-friends-hibachi
```

---

### 3. 配置环境变量

在 Cloudflare Dashboard → Workers & Pages → family-friends-hibachi → Settings → Environment variables

#### 3.1 Production 环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `RESEND_API_KEY` | `re_xxxxxx` | Resend API Key |
| `NOTIFICATION_EMAIL` | `familyfriendshibachi@gmail.com` | 接收预约通知的邮箱 |
| `ADMIN_PASSWORD` | `your_secure_password` | Admin 后台登录密码 |

#### 3.2 设置步骤

1. 进入项目设置 → Environment variables
2. 点击 **Add variable**
3. 选择 **Production** 环境
4. 输入变量名和值
5. 勾选 **Encrypt** 加密敏感数据
6. 点击 **Save**

#### 3.3 配置 KV Namespace (预约数据存储)

1. 进入 Cloudflare Dashboard → Workers & Pages → KV
2. 点击 **Create a namespace**
3. 名称填写: `family-friends-hibachi-bookings`
4. 点击 **Add**
5. 进入项目设置 → Functions → KV namespace bindings
6. 添加绑定:
   - Variable name: `BOOKINGS`
   - KV namespace: 选择刚创建的 `family-friends-hibachi-bookings`
7. 点击 **Save**

---

### 4. 配置自定义域名

#### 4.1 添加域名

1. 进入项目 → Custom domains
2. 点击 **Set up a custom domain**
3. 输入域名（如 `familyfriendshibachi.com`）
4. 按提示配置 DNS

#### 4.2 DNS 配置（如果域名在 Cloudflare）

| 类型 | 名称 | 内容 |
|------|------|------|
| CNAME | @ | family-friends-hibachi.pages.dev |
| CNAME | www | family-friends-hibachi.pages.dev |

#### 4.3 SSL 证书

Cloudflare 会自动颁发免费 SSL 证书，无需手动配置。

---

### 5. 验证部署

#### 5.1 检查网站

访问以下 URL 确认部署成功：

- 预览地址: `https://family-friends-hibachi.pages.dev`
- 自定义域名: `https://familyfriendshibachi.com`（配置后）

#### 5.2 测试 API

```bash
# 测试预约 API
curl -X POST https://family-friends-hibachi.pages.dev/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "date": "2024-12-25",
    "time": "evening",
    "guestCount": 15,
    "region": "california",
    "formType": "booking"
  }'
```

#### 5.3 测试 Admin 后台

1. 访问: `https://your-domain.com/admin`
2. 输入环境变量中设置的 `ADMIN_PASSWORD`
3. 登录后可以:
   - 查看所有预约/询价请求
   - 更新预约状态 (Pending → Confirmed → Completed)
   - 快速联系客户 (邮件/电话)

---

### 6. 常见问题

#### Q: 构建失败怎么办？

检查 Build logs，常见原因：
- Node.js 版本不匹配 → 在 Environment variables 添加 `NODE_VERSION=18`
- 依赖安装失败 → 删除 `package-lock.json` 重新生成

#### Q: API 返回 500 错误？

1. 检查环境变量是否正确设置
2. 查看 Workers 日志：Dashboard → Workers & Pages → 项目 → Logs

#### Q: 邮件收不到？

1. 检查 Resend API Key 是否有效
2. 检查 Resend 发送配额是否用完
3. 查看 Resend Dashboard 的发送日志

---

### 7. 更新部署

#### 自动部署（推荐）

推送到 `main` 分支会自动触发部署：

```bash
git add .
git commit -m "Update content"
git push origin main
```

#### 手动部署

```bash
npm run build
wrangler pages deploy build --project-name=family-friends-hibachi
```

---

### 8. 监控和日志

#### 8.1 查看访问统计

Dashboard → Workers & Pages → 项目 → Analytics

#### 8.2 查看 API 日志

Dashboard → Workers & Pages → 项目 → Logs → Real-time Logs

#### 8.3 设置告警（可选）

Dashboard → Notifications → Create → 选择事件类型

---

### 9. 成本总结

| 服务 | 免费额度 | 你的使用预估 | 费用 |
|------|---------|-------------|------|
| Cloudflare Pages | 无限带宽 | - | $0 |
| Cloudflare Workers | 10万请求/天 | <1000/天 | $0 |
| Resend 邮件 | 3000封/月 | <500/月 | $0 |
| 域名 | - | 1个 | ~$12/年 |
| **合计** | | | **~$12/年** |

---

## 快速命令参考

```bash
# 本地开发
npm start

# 构建
npm run build

# 类型检查
npm run type-check

# 部署到 Cloudflare
wrangler pages deploy build --project-name=family-friends-hibachi

# 查看部署状态
wrangler pages deployment list --project-name=family-friends-hibachi

# 查看 Workers 日志
wrangler pages deployment tail --project-name=family-friends-hibachi
```

