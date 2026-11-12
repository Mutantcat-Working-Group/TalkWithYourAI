### 1.0.20261121
  - 胶囊的尺寸改为单一来源（`src/lib/capsuleSize.ts`），窗口尺寸直接读外壳尺寸，避免两张手工维护的表再次漂移
  - 修复「润色失败」提示卡片高度异常、右侧按钮被裁切的问题：统一为 232×36，与其他胶囊状态高度一致
  - `ask_recording` / `ask_thinking` 从 168 加宽到 224——实测法语、西语、葡语、意语的标题加计时器需要 197–200px，原来会把取消按钮裁掉
  - 修复「完成」状态里关闭按钮未右对齐的问题（补上 `flex-1`，与其他状态一致）
  - 新增 14 个回归测试，钉住 10 个状态在两张尺寸表里的值，并断言外壳始终装得进窗口

### 1.0.20261120
  - 「润色失败」提示改为单行图标按钮（重试 / 插入原文 / 关闭），不再撑满整行、不再改变胶囊高度
  - 术语表从 278 条扩充到 453 条：
    - 服务网格与组网：Nacos、NetBird、Tailscale、Headscale、Netmaker、ZeroTier、CoreDNS、MetalLB、K3s、K8s、sidecar
    - Spring Cloud：Eureka、OpenFeign、Resilience4j、Hystrix、Config、Bus、Stream、Sleuth、Gateway
    - Netflix 栈：Zuul、Ribbon、Archaius
    - 可观测：OTel Collector、Tempo、Mimir、Thanos、VictoriaMetrics、Promtail、SkyWalking、Pinpoint、Elastic APM
    - 消息与存储：RocketMQ、ActiveMQ、Filebeat、Logstash、Kinesis、JuiceFS、Alluxio、GlusterFS、Redis Cluster、Redis Sentinel
    - AI：LangGraph、LangSmith、llama.cpp、vLLM、DeepSpeed、Milvus、Weaviate、Qdrant、Pinecone、FAISS、reranker
    - 构建：Turborepo、Nx、Lerna、Changesets、Deno、Bun、ESLint、Prettier
  - 单字规则改为逐条放行，且只放行非普通英文单词的产品名；`calico`、`flannel`、`consul`、`envoy`、`hibernate`、`wireguard` 因与日常英文词冲突而被排除，并加了回归测试

### 1.0.20261119
  - 润色失败不再静默降级，改为先询问用户：
    - 选择「重新生成」可无限次重试，且不重跑语音识别
    - 选择「直接插入原文」走原有的降级路径
    - 选择关闭则丢弃本条听写
  - 询问卡片不是模态框，不抢目标应用的焦点；双击只会提交一次；每次新失败都会重新弹出
  - 新增全局取消快捷键：macOS 为 `Cmd+Escape`，其他平台为 `Ctrl+Escape`，无需窗口焦点即可取消听写
  - 该快捷键在录音、转写、润色以及等待润色重试时都有效
  - 补齐胶囊 `ask_thinking`、`error`、`complete` 三个状态缺失的关闭按钮
  - 修复 `CapsulePolishing` 关闭按钮未拦截指针事件、点击会连带触发胶囊外壳的问题

### 1.0.20261118
  - 移除签名自动更新机制：
    - 删除 `tauri-plugin-updater`（Rust 与前端）、`updater:default` 权限、`plugins.updater` 配置块（含继承自上游的公钥）、`createUpdaterArtifacts`
    - 删除发版流程中的签名密钥 secrets、`.sig` 与 `latest.json` 的上传与发布
  - 改为查询 GitHub Releases 公开接口：发现新版本后给出提示并链接到发布页，由用户自行下载安装
  - 版本比较按 `主.次.YYYYMMDD` 数值进行，兼容 `v` 前缀与预发布后缀；标签格式异常、接口 404 或离线时静默不打扰
  - 应用不会自动下载或执行任何更新内容

### 1.0.20261117
  - 新增 EchoBird（`echo bird` → EchoBird）与 EchoBird Cloud
  - 术语表从 198 条扩充到 278 条：
    - 语言：C#、C++、Objective-C、.NET Core、ASP.NET、HashiCorp、GoLand
    - 后端：NestJS、Koa、hapi、Gin、Echo、Fiber、Ruby on Rails、Phoenix、OpenAPI、Swagger、Spring WebFlux、Spring Cloud Gateway
    - 数据：SQL Server、Oracle DB、DynamoDB、Firestore、Prisma、Drizzle ORM、TypeORM、Sequelize、Alembic、pgvector、Neon
    - DevOps：GitLab Runner、GitHub Runner、Argo Workflows、Flux CD、Kustomize、Helm Chart、Envoy、Consul、Rancher、OpenShift、SonarQube、Renovate
    - 数据平台：Airflow、Flink、Spark、Hive、Hadoop、Iceberg、Delta Lake、Doris、StarRocks、Druid
    - 移动与桌面：React Native、Flutter、SwiftUI、Jetpack Compose、Electron Forge、Tauri v2、uni-app
    - 测试：Playwright、Cypress、Jest、JUnit、TestNG、Mockito、pytest、tokio-test
    - 可观测与安全：Zipkin、Fluent Bit、Fluentd、Keycloak、Auth0、Casbin、OPA、mTLS、X.509
  - 剔除 5 条会破坏正常文本的候选（`end to end`、`c plus plus plus`、`so n a r`、`e two e`、`p e m`）
  - 修复 lockfile 中混入的 31 条国内镜像地址，改为官方 npm registry，并新增仓库级 `.npmrc` 锁定，避免本地镜像配置再污染 CI

### 1.0.20261116
  - 术语表从 71 条扩充到 198 条，覆盖对象存储、Spring 全家桶与主流工具链
  - 主动移除 84 条单词规则：`redis`、`docker`、`warp` 等整词替换会破坏正常英文句子，例如 `the rocket launched` 会被改成 `the Rocket launched`
  - 新增 15 句回归断言，确保普通英文句子不被改写

### 1.0.20261115
  - 润色时彻底去除思考类口头语：呃、额、嗯、啊、哦、咦、唉、哎、呀、哇、噢、唔，以及 um、uh、er、hmm 等
  - 去除无信息的思考填充：就是、就是说、那个、这个、然后呢、怎么说呢、反正、其实吧、你知道吧，以及 like、you know、I mean、kind of、actually
  - 合并口吃式重复，保留强调性重复；要求输出流畅书面语，不允许出现删词后留下的半截话
  - 长内容分点阈值从 180 汉字 / 60 词降到 120 汉字 / 45 词
  - 分点规则更主动：有两个以上要点即分点，有明确目的时先给一行摘要，保留用户自己的编号
  - 终端应用禁用分点提示——`- ` 在命令行里会被当作参数，属于坏语法

### 1.0.20261114
  - 修复 macOS 辅助功能权限弹两次框的问题：
    - 原实现先调用 `AXIsProcessTrustedWithOptions` 弹系统对话框，又主动 `open` 系统设置面板，造成两次打扰
    - 系统对话框本身已带「打开系统设置」按钮，因此去掉多余的主动打开
  - 新增独立的「打开设置」命令与横幅按钮，用户在对话框里选择拒绝后仍可主动前往设置页勾选

### 1.0.20261113
  - 新增语境感知的错别字修正：
    - 按检测到的应用类别给出词汇域提示，判断同音字与形近字
    - 编程界面上 `函树` 会改成 `函数`；邮件按商务词汇、终端按命令行词汇判断
    - 只替换错误的字词，不增删调序；人名、产品名、API 标识、路径与版本号一律不动
    - 判断不明确时保持原样，漏改好过改错
    - 选中文本模式下跳过，此时用户的显式指令优先
  - 词典面板新增开关，默认开启，十种语言均已翻译

### 1.0.20261112
  - 首个正式版本：完成去云改造
  - 移除账号、订阅与托管云整层：账号页、升级页、登录状态、云会话、云 API 客户端、认证客户端、订阅缓存、深链登录
  - Rust 侧删除托管云 STT、托管云 LLM、托管音频封装、云端请求常量、云备份恢复，以及会话令牌、托管能力层与 deep-link 插件
  - 品牌更名为 TalkWithYourAI，标识符改为 `org.mutantcat.talkwithyourai`，同步 crate 名、凭据库服务名、数据库文件名、托盘菜单与十种语言文案
  - 用仓库根 `icon.png` 经四角 flood fill 去背后重新生成全套图标
  - STT 与 AI 润色均支持自定义 Base URL 与模型，Key 可留空，允许本机与内网地址
  - 环境变量 `OPENTYPELESS_*` 改名并保留旧名兼容读取，避免破坏老用户的 Linux workaround
  - 旧 `cloud` 服务商值自动回退为 `glm-asr` / `openrouter`；旧词典格式标记仍可导入
  - 新增三平台发版流水线：macOS 通用 dmg（ad-hoc 签名）、Windows NSIS、Linux deb 与 AppImage
  - 版本号改为日期式 `1.0.YYYYMMDD`

### 1.1.48
  - 上游历史版本，详见上游仓库

### 0.1.0
  - 上游首个开源版本，详见上游仓库
