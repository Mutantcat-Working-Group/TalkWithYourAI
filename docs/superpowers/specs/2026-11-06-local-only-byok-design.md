# TalkWithYourAI 本地化改造(去登录 · 自配 API)设计

Date: 2026-11-06
Status: Awaiting user review of written spec
Scope: 整个桌面应用(前端 `src/` + Rust `src-tauri/`)、Tauri 配置、i18n、测试,以及 `.github/`、`scripts/`、仓库文档的清理
Base revision: `f5ad602`(与上游 `tover0314-w/opentypeless` 完全一致,0 差异)

## 1. 目标

把 OpenTypeless 改造成 **TalkWithYourAI**:移除账号 / 订阅 / 托管云这一整层,应用只保留一种身份 —— 用户自己的机器 + 用户自己配置的 API key。改造完成后:

- 不需要注册、登录、联网校验,首次启动即可直接进入配置流程。
- 语音识别与 AI 润色全部由用户自己填写的 provider / API key / base URL 驱动。
- 历史、词典、纠错规则、场景、应用映射等全部数据只存在本机 SQLite。
- 应用自身不包含任何后端依赖、遥测上报或授权校验。

## 2. 非目标

- **不做离线推理。** 本项目不引入 whisper.cpp、本地大模型权重下载或离线 STT 引擎。用户选择了「自带 key,仍可联网调用各家 API」这一路径:出网流量到用户自己配置的服务商为止。
- **不做上游同步。** 用户明确表示不再跟随 `tover0314-w/opentypeless`,因此不追求最小 diff,允许与上游产生大范围冲突。
- **不做本地整机配置导出/导入。** 见 §7.3。
- **不保留上游多语言门面。** 17 份非中英语言 README 删除,不提供替代翻译,只维护中英两份(§5.6)。
- **不新增发版流水线。** 本仓库没有发布 workflow,本次只改 updater endpoint 与署名,发版流程是独立后续任务(§8)。
- **不改动** 听写、Ask、翻译、应用感知、词库、热键、托盘、辅助功能等本地功能的行为。

## 3. 已确认决策

| 议题 | 决策 |
| --- | --- |
| 「本地完全运行」边界 | 免账号 + 自带 key,允许联网调用用户自己的服务商 |
| 云端代码处理方式 | 彻底删除,不做 feature flag,不保留隐藏入口 |
| 品牌 | 产品名 `TalkWithYourAI`;bundle identifier `org.mutantcat.talkwithyourai` |
| 设置界面结构 | 保留「语音识别」+「AI 润色」两个面板,仅移除其中的 cloud 分支 |
| 自动更新 | 保留 updater 机制,endpoint 改为本仓库 releases |
| 引导页 | 8 步精简为 6 步,删除「账号」与「模式选择」 |
| 旧名清理范围 | 应用本身 + 仓库门面 + 上游内部文档全部清理,不留旧名;唯一例外是 MIT 署名(§12) |
| 仓库门面 | 19 份语言 README 只保留 `README.md` 与 `README_zh.md`,其余 17 份删除;上游捐款链接与发布设施删除;`handoff.md` 删除 |
| 上游内部文档 | `docs/` 与 `docs/superpowers/` 中的上游文档全删,仅保留本次这份 spec |
| 词典文件格式标识 | 改名为 `talkwithyourai_dictionary`,同时兼容读取旧标识 |
| 应用图标 | 用用户提供、位于仓库根的 `icon.png` 替换全套应用图标(§4.1) |

## 4. 目标身份

需要同步替换的位置:

| 位置 | 现值 | 目标值 |
| --- | --- | --- |
| `src-tauri/tauri.conf.json` → `productName` | `OpenTypeless` | `TalkWithYourAI` |
| `src-tauri/tauri.conf.json` → `identifier` | `com.opentypeless.app` | `org.mutantcat.talkwithyourai` |
| 窗口标题(main / capsule / ask) | `OpenTypeless *` | `TalkWithYourAI *` |
| `src-tauri/Cargo.toml` → `package.name` | `opentypeless` | `talkwithyourai` |
| `src-tauri/Cargo.toml` → `lib.name` | `opentypeless_lib` | `talkwithyourai_lib` |
| `src-tauri/src/main.rs` | `opentypeless_lib::run()` | 跟随上一条 |
| `src-tauri/src/credentials.rs` → `SERVICE_NAME` | `OpenTypeless` | `TalkWithYourAI` |
| `src-tauri/src/lib.rs` → `opentypeless.db` | `opentypeless.db` | `talkwithyourai.db` |
| `src/lib/constants.ts` → `APP_NAME` | `OpenTypeless` | `TalkWithYourAI` |
| `src/lib/constants.ts` → `APP_REPO_URL` / `APP_LICENSE_URL` | 上游地址 | 本仓库地址 |
| `src/i18n/locales/*.json` → `app.name`(10 份) | `OpenTypeless` | `TalkWithYourAI` |
| 托盘 / 用户可见文案中的品牌名 | `OpenTypeless` | `TalkWithYourAI` |
| 词典 / 场景导出文件名前缀 | `opentypeless-*` | `talkwithyourai-*` |
| `package.json` → `name` / `repository` / `homepage` / `author` / `version` | 上游信息 | 本仓库信息 |
| `src-tauri/src/lib.rs` → tracing 过滤器默认指令 | `opentypeless=debug` | `talkwithyourai=debug` |
| `src-tauri/src/lib.rs` → 托盘 tooltip 与启动日志 | `OpenTypeless` | `TalkWithYourAI` |
| `index.html` → `<title>` | 含上游名 | `TalkWithYourAI` |
| `.github/CODEOWNERS` | `@tover0314-w` | Mutantcat 团队账号或删除该文件 |
| `.github/workflows/*.yml` → 临时目录名 | `opentypeless-packaging-tools` 等 | `talkwithyourai-*` |
| `.github/scripts/*` → 打包守卫内部标识 | `.opentypeless-linuxdeploy-*`、`OpenTypeless.AppDir`、`OpenTypeless.AppImage` | 同步改名,**两侧必须一致**(见 §5.6) |
| `scripts/create-labels.sh` → 目标仓库 | `tover0314-w/opentypeless` | 删除该脚本(§5.6) |

**跟踪日志过滤器是功能性改动,不是文案**:crate 改名后模块路径随之变化,若不同步修改 `opentypeless=debug` 这一 EnvFilter 指令,`RUST_LOG` 调试输出会静默失效。

### 4.1 应用图标替换

**源文件:** 仓库根目录 `icon.png`,由用户提供。已实测:`1024×1024`、8-bit、**colortype 2(RGB,无 alpha 通道)**,内容为黑底圆角方块 + 白色复古麦克风。

**现状:** `src-tauri/icons/` 下有 8 个文件 —— `32x32.png`、`64x64.png`、`128x128.png`、`128x128@2x.png`、`icon.png`(512×512)、`icon.icns`、`icon.ico`、`app-icon.svg`。`tauri.conf.json` 的 `bundle.icon` 引用其中 5 个。`app-icon.svg` 是**上游 logo 的矢量源**,必须删除。`index.html` 中没有 favicon 引用,无需处理。

**关键陷阱(已采样验证):** 源图没有 alpha 通道,圆角外的背景是与图形无关的近白色,而麦克风图形本体同样是近白色:

| 采样点 | RGB |
| --- | --- |
| 左上角 `(0,0)` | `(252, 253, 251)` |
| 圆角外 `(20,20)` | `(254, 254, 254)` |
| 麦克风本体 `(512,300)` | `(254, 255, 254)` |
| 圆角内黑底 `(120,120)` | `(23, 23, 23)` |

因此**严禁使用「全局白色 → 透明」的处理方式** —— 麦克风会被直接打穿。必须使用**从四角 flood fill**(仅清除与图像边界连通的背景像素)或几何圆角遮罩。麦克风的白色被黑色底包围、与图像边界不连通,flood fill 不会波及。

**处理步骤:**

1. 预处理:对根 `icon.png` 做四角 flood fill 去背,输出带透明圆角的 RGBA 图,保存为 `src-tauri/icons/app-icon-source.png` 并入库,作为后续重新生成图标的唯一源文件。
2. 生成全套图标:`npx tauri icon src-tauri/icons/app-icon-source.png`(Tauri CLI 已在 devDependencies 中)。该命令会覆盖 `src-tauri/icons/` 下的标准产物(`icon.icns`、`icon.ico`、各尺寸 PNG,以及 Windows Store 系列)。
3. 删除 `src-tauri/icons/app-icon.svg`(上游 mark)。
4. 确认 `tauri.conf.json` 的 `bundle.icon` 5 项引用仍然有效。
5. 删除仓库根的 `icon.png`(已由第 1 步的源文件取代)。
6. 托盘图标无需单独配置:`lib.rs` 通过 `app.default_window_icon()` 从 bundle 图标派生,但必须实际验证托盘显示为新图标。
7. 验证 `.app` 的 Dock 图标四角透明、无白色直角残留。

**排布说明(不默认调整):** 源图主体为 924×926、四周留白约 50px;Apple 官方网格为 824×824 主体 + 100px 留白。当前构图在 Dock 中会比系统图标略大。默认**保持用户给定构图不变**,仅做透明化;若要与系统图标视觉一致,可将主体整体缩放到 824 并居中、圆角半径约 185px。此项需用户明确要求才执行。

**关于 `docs/app-icon-sources.md`:** 该文件记录的是应用感知功能所用的**第三方应用图标**(webp)来源与授权信息,与产品自身图标无关,**必须保留**(见 §5.6)。

`package.json` 的 `version` 与 `Cargo.toml` 的 `version` 必须保持同值(当前均为 `1.1.64`);`src/lib/constants.ts` 的 `APP_VERSION` 开发期回退值 `v1.1.61` 一并校正为与二者一致。

**许可相关例外:** `LICENSE`、`THIRD_PARTY_NOTICES.md` 的原版权声明与 `README*.md` 中的上游出处说明必须保留,不得因为改名而删除。见 §12。

## 5. 删除清单

### 5.1 Rust 后端

| 目标 | 位置 | 规模 |
| --- | --- | --- |
| 托管云 STT | `src-tauri/src/stt/cloud.rs` | 654 行 |
| 托管云 LLM | `src-tauri/src/llm/cloud.rs` | 411 行 |
| 托管音频字节流封装 | `src-tauri/src/stt/managed_audio.rs` | 693 行 |
| 云端请求常量 | `src-tauri/src/cloud_request.rs` | 79 行 |
| 云备份恢复(仅被账号页调用) | `src-tauri/src/commands/backup.rs` | 362 行 |

同时移除的分散逻辑:

- `lib.rs`:`DEFAULT_API_BASE_URL`、`api_base_url()`、`CLIENT_VERSION_HEADER`、`with_desktop_client_version()`、`pub mod cloud_request`、`SessionTokenStore` 及 `.manage(...)` 注册。
- `commands/config.rs`:`get_session_token`、`set_session_token` 两个命令及其 state 参数。
- `commands/stt.rs`:`cache_managed_stt_capability`、`clear_managed_stt_capability` 命令,以及 `/api/subscription/status` 探针。
- `commands/llm.rs`:订阅状态探针与 cloud provider 分支。
- `commands/ask.rs`:cloud proxy 分支、`warm_managed_cloud_on_intent` 调用、相关 `token_store` 参数。
- `hotkey.rs`:cloud 相关的 `SessionTokenStore` 取用点。
- `stt/capabilities.rs`:仅剥离 managed 部分 —— `ManagedSttCapability`、`ManagedSttCapabilityState`、`managed_audio_encoding_config()`、`managed_state_from_authenticated_snapshot()`、`compatible_managed_limits()` 及 `recordingLimits.reasons.managed*` 分支。**本地各 provider 的录音时长上限逻辑必须保留**,它同时服务本地 provider。
- `storage/mod.rs`:`AppConfig.managed_stt_capability_state` 字段及其默认值。
- `stt/mod.rs` 与 `llm/mod.rs` 中 `"cloud"` 的 provider 分发分支;`stt/config.rs` 中 `cloud` 的例外处理。
- 全部 **21 处** `session_token` 参数签名,以及 75 个已注册命令中上表列出的云端命令注册项。

删除后 `AppConfig` 只剩一个需要处理的丢弃字段(见 §7.1),其余字段全部保留。

### 5.2 前端

| 目标 | 位置 | 规模 |
| --- | --- | --- |
| 账号页 | `src/components/AccountPage/` | 1058+ 行 |
| 升级页 | `src/components/UpgradePage/` | 373 行 |
| 登录状态 | `src/stores/authStore.ts` | 622 行 |
| 云会话 | `src/lib/cloud-session.ts` | 129 行 |
| 云 API 客户端 | `src/lib/api.ts` | 全文件为 checkout / 订阅 / 云备份 |
| 认证客户端 | `src/lib/auth-client.ts` | 52 行 |
| 云服务状态 | `src/stores/cloudServiceStore.ts` | 41 行 |
| 登录回跳 | `src/lib/desktop-auth-callback.ts` | — |
| 结账意图 | `src/lib/desktop-checkout-intent.ts` | — |
| 订阅缓存 | `src/lib/last-known-subscription.ts`、`src/lib/subscription-refresh-policy.ts` | — |
| 深链登录监听 | `src/lib/deep-link.ts` | — |
| 更新提示 | `src/components/UpdatePrompt.tsx` | 重写为目标仓库地址,见 §8 |
| 云服务横幅 | `src/components/MainLayout/CloudServiceBanner.tsx` | — |
| 引导页步骤 | `src/components/Onboarding/AccountStep.tsx`、`ModeSelectStep.tsx` | 见 §9 |

同时移除的分散逻辑:

- `App.tsx`:auth 初始化、`authLoading`、pending checkout 跳转、订阅聚焦刷新 effect、`UpdatePrompt` 之外的 auth 相关 effect 与 import。
- `MainLayout/index.tsx`:底部「账号」导航项、侧栏 Pro/升级入口、`hasCloudAccess` 逻辑。
- `HomePage/index.tsx`:账号与云额度相关区块。
- `Settings/SttPane.tsx`、`Settings/LlmPane.tsx`:`isCloud` 分支、`hasManagedCloudAccess`、cloud 专属文案与测试连接旁路。
- `hooks/useTauriEvents.ts`:`auth:session-invalid` 监听与 cloud service 事件消费。
- `lib/constants.ts`:`API_BASE_URL`、`CLIENT_VERSION_HEADER`、`APP_VERSION_HEADER_VALUE`、`FREE_PLAN`、`CheckoutProduct`、`CLOUD_PLAN_BENEFITS`、`PRO_PLAN`、`LIFETIME_PLAN`、`CHECKOUT_PLANS`、`DEFAULT_CHECKOUT_PRODUCT`、`ACTIVE_CLOUD_PLANS`、`isActiveCloudPlan()`、`STT_PROVIDERS`/`LLM_PROVIDERS`/`LLM_DEFAULT_CONFIG` 中的 `cloud` 条目,以及因此变成空操作的 `ONBOARDING_*_PROVIDERS` 过滤条件。
- `stores/appStore.ts`:`SttProvider`、`LlmProvider` 联合类型中的 `'cloud'`;`SceneSource` 中未被使用的 `'cloud'`。
- `lib/tauri.ts`:`restore_backup_data` 等云备份封装函数。
- `lib/router.ts`:`Route` 联合类型与 `parseHash()` 中的 `'upgrade'`、`'account'` 两个路由及其跳转(已核实二者均为 `Route` 成员)。

保留 `lib/backup-settings.ts` 中与云无关的本地配置数据整理逻辑;若其中存在仅供云备份使用的辅助函数,一并移除。

### 5.3 i18n

10 份 locale(`en`、`zh`、`ja`、`ko`、`fr`、`de`、`es`、`pt`、`ru`、`it`)统一删除以下 key 树:

- `account.*`
- `upgrade.*`
- `nav.account`、`nav.upgrade`、`nav.pro`
- `onboarding.account.*`、`onboarding.mode.*`
- `onboarding.steps.signIn`、`onboarding.steps.signInSub`、`onboarding.steps.chooseMode`、`onboarding.steps.chooseModeSub`
- `providers.stt.cloud`、`providers.llm.cloud`
- `settings.cloudSttPro`、`settings.cloudLlmPro`
- `recordingLimits.reasons.managedCapability`、`recordingLimits.reasons.managedFallback`
- `recordingLimits.allowedCloudRange`、`recordingLimits.currentSelectionWithCloudMax`
- `cloudService.*`(云服务横幅文案)

`app.name` 按 §4 改名。现状核实:10 份 locale 的 key 集合当前**完全一致,均为 790 个 key**。改造后必须维持这一性质 —— 以 `en.json` 为基准,用脚本比对全部 10 份文件,不允许出现某语言残留已删 key 或缺失新增 key 的情况。

### 5.4 Tauri 配置与插件

- `src-tauri/tauri.conf.json`:移除 `plugins.deep-link` 配置;`plugins.updater.endpoints` 改为本仓库地址(§8);`pubkey` 保持占位并在 README 标注需自行生成(§8);`productName`、`identifier`、窗口标题按 §4 替换。
- `src-tauri/Cargo.toml`:移除 `tauri-plugin-deep-link` 依赖;`tauri-plugin-single-instance` 的 `deep-link` feature 移除(若移除后该插件其余能力仍需保留,则改为不带该 feature);保留 `tauri-plugin-updater`、`tauri-plugin-process`。
- `src-tauri/capabilities/*.json`:移除 `deep-link:default` 权限。
- `src-tauri/src/lib.rs`:移除 deep-link 插件注册、单实例 deep-link 处理分支。

### 5.5 测试

- 删除:`src/stores/__tests__/authStore.test.ts`、`authStore.restart.test.ts`、`src/components/AccountPage/__tests__/`(2 个)、`src/components/UpgradePage/__tests__/`、`src/lib/__tests__/auth-client-session.test.ts`、`cloud-session.test.ts`、`desktop-auth-callback.test.ts`、`desktop-checkout-intent.test.ts`、`last-known-subscription.test.ts`、`subscription-refresh-policy.test.ts`、`deep-link.test.ts`。
- 更新:`MainLayout.test.tsx`、`Settings.test.tsx`、`SttPane.test.tsx`、`LlmPane.test.tsx`、`Onboarding.test.tsx`、`DictionaryPane.test.tsx`、`History.test.tsx`、`AskPanel.test.tsx`、`tauri.test.ts`、`tauri-ask.test.ts`、`useTauriEvents.test.tsx`、`releaseVersion.test.ts` 等凡引用被删模块或用例断言 cloud 行为的文件。(`HomePage` 目前没有测试文件,若改造中需要覆盖其账号区块移除后的行为,则新建。)
- 新增:旧配置回退用例(§7.1),Rust 侧 `AppConfig` 反序列化含 `managed_stt_capability_state` / `stt_provider: "cloud"` 的 JSON 时落到合法默认值。
- 目标状态:`npx vitest run` 与 `cargo test` 全绿,且不存在 `#[ignore]` 新增项。

### 5.6 仓库门面与文档清理

用户要求旧名与上游设施彻底清理,因此除应用本身之外,以下内容一并处理。

**删除:**

| 目标 | 原因 |
| --- | --- |
| `README_ar/de/es/fr/hi/id/it/ja/ko/nl/pl/pt/ru/th/tr/vi.md`(17 份) | 只保留中英两份,其余为上游多语言门面 |
| `handoff.md` | 上游作者的开发交接笔记,内含其本地路径 `/Users/bytedance/...`,与本仓库无关 |
| `.github/FUNDING.yml` | `buy_me_a_coffee: opentypeless` 是**上游作者的收款链接**,保留等于替上游募捐 |
| `.github/workflows/welcome.yml` | 欢迎语指向上游 issues 与 CONTRIBUTING |
| `scripts/create-labels.sh` | 硬编码 `REPO="tover0314-w/opentypeless"`,会往上游仓库建标签 |
| `.github/scripts/import-linux-gpg-key.sh` | 仅服务上游 Linux 发版签名 |
| `.github/scripts/import-windows-certificate.ps1` | 仅服务上游 Windows 发版签名 |
| `.github/scripts/publish-signpath-windows-release.ps1` | 内含 `gh release create --repo tover0314-w/opentypeless`,直接对上游发布 |
| `.github/scripts/upload-linux-verification-artifacts.sh` | 内含 `--repo tover0314-w/opentypeless`,上传到上游 |
| `docs/` 下 52 份上游设计与发版文档 | 含 cloud 用量、typeless 竞品对比、上游发版说明等 |
| `docs/superpowers/plans/` 与 `specs/` 中的上游文档 | 清空,仅保留本 spec |
| `docs/images/website.png`、`website-hero.png`、`website-how-it-works.png` | 上游官网营销截图 |
| `docs/images/desktop-upgrade-lifetime.png` | 展示已删除的升级页 |
| `docs/images/demo.gif` | 没有任何 README 引用 |
| 仓库根 `icon.png` | 作为图标源已在 §4.1 第 1 步转为 `src-tauri/icons/app-icon-source.png`,根目录不再保留副本 |
| `src-tauri/icons/app-icon.svg` | 上游 logo 矢量源(§4.1) |

**保留但需改写(去除上游仓库引用与已删功能章节):**

- `README.md`、`README_zh.md`:删掉云服务 / 订阅 / 账号相关章节与截图、上游 Star 与 Discord 徽章、上游 Release 徽章;保留 fork 署名(§12);注明多语言 README 已移除。
- `CONTRIBUTING.md`、`SECURITY.md`、`SUPPORT.md`、`VISION.md`:重写为指向本仓库;`VISION.md` 中「隐私优先 / BYOK / 无强制云账号」表述与本改造方向一致,保留并补上「应用自身不含后端依赖」。
- `.github/CODEOWNERS`:改为 Mutantcat 团队账号;若暂无团队账号则删除该文件。
- `.github/ISSUE_TEMPLATE/config.yml`:删除指向上游 discussions 的两个链接。
- `docs/images/` 其余截图:`app-main-light.png`、`app-settings.png`、`app-history.png`、`onboarding-stt.png`、`v1.1.49-*.jpg`、`voice-flow-demo.gif`。**实施时必须逐张打开确认**,任何露出账号入口 / 升级入口 / 云服务选项的截图一律删除,并去掉 README 中的对应引用 —— 不允许用改造前的界面截图冒充改造后的界面。

**保留不动:**

- `docs/` 中被保留的资产,删除上游文档后 `docs/` 只应剩以下内容,其余一律清除:
  - `docs/app-icon-sources.md` —— 记录应用感知功能所用**第三方应用图标**的来源与授权,是重新发布二进制前的合规依据,必须保留。
  - `docs/release-signing.md` —— 需改写:现有内容全部指向上游仓库与上游 secrets,须替换为本仓库的签名/公证说明,并与 §8 的 updater 公钥要求对齐。
  - `docs/images/` 中经 §5.6 逐张核验后保留的截图。
  - `docs/superpowers/specs/2026-11-06-local-only-byok-design.md`(本文件)。
- `.github/workflows/ci.yml`、`codeql.yml`、`labeler.yml`、`lock-threads.yml`、`pr-title.yml`、`stale.yml`、`typos.yml`、`check-notarization.yml`、`.github/dependabot.yml`、`.github/PULL_REQUEST_TEMPLATE.md`、`.github/labeler.yml`、`.gitignore`、`.gitattributes`、`.editorconfig`、`.typos.toml`、`.prettierrc`、`eslint.config.js`、`tsconfig*.json`、`vite.config.ts`、`vitest.config.ts`、`.vscode/`。`check-notarization.yml` 虽与发版相关,但不含上游引用,是手动触发的公证状态查询工具,保留。
- `.github/scripts/` 中**被 `ci.yml` 依赖**的 5 个打包守卫脚本必须保留:`test-linux-appimage-packaging.sh`、`prepare-linuxdeploy-wrapper.sh`、`linuxdeploy-exclude-wrapper.rs`、`linuxdeploy-plugin-appimage-exclude-wrapper.sh`、`verify-appimage-runtime-libraries.sh`。`ci.yml` 会执行 `test-linux-appimage-packaging.sh` 与 `prepare-linuxdeploy-wrapper.sh`,删除会导致 CI 失败。这 5 个脚本只做内部标识改名:`.opentypeless-linuxdeploy-*` → `.talkwithyourai-linuxdeploy-*`,以及测试夹具名 `OpenTypeless.AppDir` / `OpenTypeless.AppImage` → `TalkWithYourAI.AppDir` / `TalkWithYourAI.AppImage`。**改名必须两侧同步**:`linuxdeploy-exclude-wrapper.rs` 中 `OsString::from("OpenTypeless.AppDir")` 是断言期望值,`test-linux-appimage-packaging.sh` 中同名变量是实际传入值,只改一侧会让该守卫用例失败。

## 6. 保留清单

以下能力不做行为改动:

- **BYOK 凭据**:`keyring` 三个平台的原生凭据库存储路径(`set_credential` / `read_credential` / `clear_credential` / `get_credential_status` / `migrate_legacy_credentials`)。
- **本地存储**:SQLite(`history`、`dictionary`、`correction_rules` 及场景/应用映射表)、`tauri-plugin-store`。
- **全部非 cloud 服务商**:STT 的 deepgram、assemblyai、aliyun-qwen3-asr、volcengine-doubao、glm-asr、openai-whisper、groq-whisper、siliconflow、apple-speech、custom-whisper;LLM 的 zhipu、deepseek、siliconflow、openai、gemini、moonshot、doubao、qwen、groq、claude、ollama(免 key)、openrouter。
- **本地可自定义项**:`stt_custom_base_url` / `stt_custom_model`(自建 Whisper)、`llm_base_url`(任意 OpenAI 兼容端点)、`llmProviderRequiresApiKey()` 的 ollama 免 key 判定。
- **功能**:听写与润色流水线、Ask Anything、翻译、应用感知风格映射、词典与纠错规则、场景(内置 / 自定义 + 导入导出)、热键、托盘、辅助功能权限、输出策略与剪贴板回退、录音时长限制、历史记录与保留策略。
- **本地导入导出**:词典 JSON / CSV 导出、场景 JSON 导出、词典导入。

## 7. 兼容性与数据迁移

### 7.1 旧配置回退

`AppConfig` 使用 `#[serde(default)]`,因此删除 `managed_stt_capability_state` 字段后旧配置不会反序列化失败。但 `stt_provider` / `llm_provider` 的**取值**可能仍是 `"cloud"`。要求:

- 在配置归一化路径(读取配置后、构造 provider 之前)加入显式回退:若 `stt_provider == "cloud"` → 回退到 `glm-asr`;若 `llm_provider == "cloud"` → 回退到 `openrouter`。
- 回退必须同时覆盖前端:`appStore` 收到含 `"cloud"` 的配置时,渲染前归一化,避免下拉框出现空选项。
- 该回退需要在 Rust 与前端两侧各有一条测试覆盖。

### 7.2 换 identifier 的后果(需在 README 说明)

identifier、`productName`、keyring 服务名、数据库文件名同时变更,意味着 TalkWithYourAI 与既往的 OpenTypeless 安装是**两个互不相关的应用**:

- 应用数据目录变化 → 旧的历史记录、词典、场景不会自动继承。
- keyring 服务名变化 → 旧的 API key 不会自动继承,需要重新填写。
- 旧的 OpenTypeless 与本应用可以同时安装、互不干扰。

迁移手段(写入 README,不写自动化代码):

- 历史 / 词典:使用词典 JSON / CSV 导出后重新导入;SQLite 文件位于旧应用数据目录(`opentypeless.db`),可手动复制并改名为 `talkwithyourai.db`。
- API key:在新应用设置页重新填写。

### 7.3 云备份能力的去处

账号页删除后,`restore_backup_data` 失去全部调用方(`src/lib/tauri.ts` 是唯一入口,且只被账号页的云备份下载流程使用),因此整条路径删除,包含 `commands/backup.rs`。

未来若要恢复数据可携带性,正确的形态是**本地文件导出 / 导入**(导出为 JSON,由用户自己选择保存位置),而不是任何云端备份。该能力**不在本次范围内**,不做实现。

### 7.4 词典文件格式标识改名(需双向兼容)

`src-tauri/src/dictionary_io.rs` 中有两处 `opentypeless_dictionary` 并非品牌文案,而是**用户可见的文件格式标识**:

- `CSV_MARKER = "# opentypeless_dictionary"`(CSV 首行标记)
- JSON 载荷中的 `"format": "opentypeless_dictionary"`

按「不留旧名」的要求改名为 `talkwithyourai_dictionary`,但**必须同时兼容读取旧标识**,否则旧版导出的词典文件将无法导入:

- 导出:只写新标识 `talkwithyourai_dictionary`。
- 导入:`talkwithyourai_dictionary` 与 `opentypeless_dictionary` 均接受,后者视为旧版格式正常解析。
- 测试:新增用例覆盖「导入旧标识 CSV」与「导入旧标识 JSON」两条路径,并断言导出产物只含新标识。
- 该旧标识字符串是本设计中**唯一允许以字面量形式保留旧名的地方**,需在代码处加注释说明其为向后兼容的格式标记,避免后续被当作残留清理掉。

## 8. 自动更新

- 保留 `tauri-plugin-updater`、`tauri-plugin-process` 与 `UpdatePrompt` 组件,`check()` 失败时维持现有行为(捕获异常、`console.warn`、静默不显示)。
- `endpoints` 改为:
  `https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/latest/download/latest.json`
- **`pubkey` 必须在首次发版前替换为自建密钥对的公钥。** 现有 `pubkey` 属于上游作者,用它无法验证本仓库自己的签名。生成方式:`npx tauri signer generate -w ~/.tauri/talkwithyourai.key`,公钥写入 `tauri.conf.json`,`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 存入本仓库 CI secrets。在完成这一步之前,更新检查会因签名校验失败而报错 —— 表现为静默 warn,不影响应用使用。
- 本仓库 `.github/workflows/` 目前**没有发版流程**(仅 `ci.yml` 检查型 + `pr-title.yml` 等),上游的发版 workflow 位于作者自己的仓库。因此本变更只改 endpoint,不新增发版 workflow;发版流水线是独立后续任务,需在 README 记录为待办。

## 9. 引导页

步骤从 8 步调整为 6 步,顺序如下:

| 新序号 | 步骤 | 与现状的差异 |
| --- | --- | --- |
| 0 | Welcome | 文案去掉云服务相关表述 |
| 1 | 语音识别(STT) | 原第 3 步;provider 列表不含 `cloud` |
| 2 | AI 润色(LLM) | 原第 4 步;provider 列表不含 `cloud` |
| 3 | 权限 | 原第 5 步,不变 |
| 4 | 快速测试 | 原第 6 步,不变 |
| 5 | 完成 | 原第 7 步;去掉升级引导 |

规则调整:

- 删除 `AccountStep`、`ModeSelectStep` 两个组件及其在 `Onboarding/index.tsx` 中的分支。
- 删除 `TOTAL_STEPS` 的账号与模式分支:原 `step === 1` 的「必须登录才能 Next」判定、`onboardingMode` 状态、`handleSkip` 中 `step === 1` 跳转到 BYOK 的特殊分支、`handleBack` 中 `step === 5 && onboardingMode === 'cloud'` 与 `step === 3 && !user` 两个特殊分支,以及 `handleNext` 中 `step === 2 && onboardingMode === 'cloud'` 的分支。
- `onboardingMode` 状态本身与 `appStore` 中的 `onboardingMode` / `setOnboardingMode` 一并移除(确认无其他消费方后)。
- **保留**「STT 与 LLM 必须测试通过才能继续」这一约束(即原 `sttTestStatus === 'success'` / `llmTestStatus === 'success'` 判定)。用户在 §3 中选择了该默认行为。
- 「跳过」按钮保留:非第 1 步时跳过整个引导。

## 10. 设置界面

保留现有「语音识别」与「AI 润色」两个面板及 `SettingsSidebar` 的 6 个面板(通用 / 语音识别 / AI 润色 / 词典 / 场景 / 关于),不合并、不改名。仅做以下收窄:

- **语音识别面板**:`provider` 下拉去掉「OpenTypeless 云服务」选项;删除 `isCloud` 分支、cloud 专属的「Pro 权益」提示区块、`hasCloudAccess` 判断,以及因 cloud 而旁路的测试连接逻辑。保留主界面常见 provider 的 API key 输入、自建 Whisper 的 base URL / 模型 / 预设、各 provider 录音上限提示。
- **AI 润色面板**:同上 —— 去掉 cloud 选项与 Pro 提示;保留 provider / API key / base URL / 模型、拉取模型列表、连接测试、benchmark、Ollama 免 key 处理、润色风格、上下文适配、翻译目标语言。
- **设置页可发现性**:首次无 key 时,「语音识别」/「AI 润色」面板沿用现有缺失凭据提示;不新增引导弹窗。
- **关于面板**:版本号、仓库地址、许可地址改指向本仓库;删除任何订阅相关文案。

## 11. 改造后的网络行为

改造后应用只有以下出网调用,全部由用户显式配置触发:

1. 用户在「语音识别」面板选择的 STT 服务商(WSS / HTTP,使用用户自己的 key 或本地端点)。
2. 用户在「AI 润色」面板选择的 LLM 服务商(含 Ollama 等本地端点)。
3. 语音搜索类意图按用户语音指令打开的搜索引擎(经系统默认浏览器/`opener` 打开,属用户主动行为)。
4. 自动更新检查(§8),不携带任何用户数据。

已核实:代码库中**不存在**遥测、埋点、崩溃上报或分析 SDK(`grep -i "telemetry|analytics|sentry|posthog|amplitude"` 无结果)。改造完成后应用不再包含任何指向 `opentypeless.com` 的运行时请求。

## 12. 许可与署名

MIT 许可证要求保留原版权声明,因此:

- `LICENSE`(MIT,Copyright 归原作者)与 `THIRD_PARTY_NOTICES.md` **原样保留**。
- `README.md` 增加一行 fork 说明,注明本项目基于 `tover0314-w/opentypeless` 修改。
- README 中的云服务、订阅、账号相关章节删除或改写;上游链接类内容(Star、Discord、Release 徽章)按品牌改名相应处理。
- 17 份非中英语言 README 按 §5.6 **删除**,不做改名保留,也不在本仓库内提供替代翻译;此后只维护 `README.md` 与 `README_zh.md` 两份。`README.md` 需在其中注明多语言版本已随上游内容一并移除。

## 13. 验证

按顺序执行,任一步失败都视为未完成:

1. `npm install`(仓库用 npm,`package-lock.json` 为准)。
2. `npx tsc --noEmit` —— 类型检查必须零错误,这是删除类型联合成员后最主要的正确性护栏。
3. `npx eslint src/` 与 `npx prettier --check src/` —— 与 CI 一致。
4. `npx vitest run` —— 全绿。
5. `cargo test`(工作目录 `src-tauri`)—— 全绿。
6. `cargo clippy --all-targets -- -D warnings` —— 仓库 CI 使用严格 Clippy。
7. `npm run build` —— 前端产物构建成功。
8. `cargo build`(debug)—— Rust 侧编译通过(首次编译耗时较长,含 bundled SQLite)。
9. **残留审计(旧名 + 上游后端)**,逐条确认:
   - 代码中不得命中:`www.opentypeless.com`、`api_base_url`、`SessionTokenStore`、`managed_stt`、`cloud_request`、`authStore`、`hasManagedCloudAccess`、`cloud-session`、`tauri-plugin-deep-link`、`opentypeless.db`、`OPEN_TYPELESS`。
   - 全仓(含 `README*`、`.github/`、`scripts/`、`docs/`)不得命中字面量 `OpenTypeless` / `opentypeless`,**唯一豁免**是下面这份白名单:
     - `LICENSE` 与 `THIRD_PARTY_NOTICES.md` 中的原版权声明(§12)。
     - `README.md` / `README_zh.md` 中的一行 fork 出处说明(§12)。
     - `src-tauri/src/dictionary_io.rs` 中作为向后兼容格式标记的旧标识 `opentypeless_dictionary`(§7.4)。
     - `package-lock.json` 中来自 npm 依赖的包名或 URL 佐证(若确有依赖来源含该字符串,需在提交信息中说明具体来源,不允许整文件豁免)。
   - 白名单以外的任何命中都视为未完成。
10. i18n key 一致性脚本:10 份 locale 的 key 集合完全一致,且不含 §5.3 列出的 key 树。
11. 图标资产核验: `src-tauri/icons/` 下 `icon.icns`、`icon.ico`、各尺寸 PNG 均由新源生成(比对 mtime);`app-icon.svg` 已删除;`icon.png` 与 `128x128.png` 的 colortype 为 6(RGBA);对生成后的 `128x128.png` 采样四角像素,确认 alpha 为 0(即圆角透明,无白色直角);确认麦克风图形区域未被去背误伤(该区域 alpha 为 255)。

**无法在本机完成的验证(需真机,明确记录为未验证项):**

- macOS / Windows / Linux 实际安装包运行、签名与公证。
- 麦克风与辅助功能权限的真实授权流程。
- 用真实 API key 对各家服务商逐一连通测试。
- 自动更新的端到端链路(在 §8 的签名公钥替换与首个 release 发布之前无法验证)。

工具链位置(本机不在默认 PATH 上):`~/.cargo/bin/cargo`、`~/.nvm/versions/node/v22.23.1/bin/node`。

## 14. 交付顺序

1. **后端拆除**:Rust 侧云端模块、会话令牌、命令注册、配置字段与回退,`cargo test` + clippy 通过。
2. **前端拆除**:云模块、账号页、升级页、导航入口、`App.tsx`、`appStore` 类型与回退,`vitest` 通过。
3. **引导页与设置面板收窄**。
4. **品牌替换**(§4)与 Tauri 配置 / 依赖 / 权限调整。
5. **应用图标替换**(§4.1):去背 → `tauri icon` → 删除上游矢量源 → 四角与麦克风采样核验。
6. **i18n 清理与一致性校验**。
7. **词典格式标识改名与双向兼容**(§7.4)。
8. **仓库门面与上游文档清理**(§5.6),含打包守卫脚本的同步改名。
9. **README 与许可署名处理**(§12)。
10. **全量验证与残留审计**(§13)。

每一步独立可验证,便于在任一步骤失败时定位问题范围。

## 15. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 删除 `session_token` 触及 21 处命令签名与前端调用 | 编译期大量连锁错误 | 按 §14 顺序先做后端,依赖 Rust 编译器穷举所有断点;前端随后用 `tsc --noEmit` 兜底 |
| `capabilities.rs` 中 managed 与本地逻辑交织 | 误删会导致本地录音上限显示异常 | 只删 managed 专有函数与分支,保留 provider 上限表;由现有 recordingLimits 测试回归 |
| i18n 10 份文件手工删 key 易错位 | 运行时缺 key 显示原始 key 字符串 | 用脚本比对 key 集合并纳入 §13 验证流程 |
| 换 identifier 后旧用户数据「消失」 | 用户误以为数据丢失 | README 明确写出两个应用互相独立及迁移步骤(§7.2) |
| 上游 `pubkey` 未替换即发版 | 更新下载必然签名校验失败 | README 与 §8 明确标注为首次发版前必做项 |
| 仓库无发版流水线 | 改完 endpoint 也无法产出 `latest.json` | 明确列为独立后续任务,不在本范围内假装完成 |
| `.github/scripts/` 中 5 个脚本被 `ci.yml` 依赖 | 误删会使 CI 的 Linux 打包守卫任务失败 | §5.6 已明确区分「发布专用(删)」与「打包守卫(留)」两组,删除前先核对 `ci.yml` 的调用点 |
| 打包守卫夹具改名只改一侧 | `test-linux-appimage-packaging.sh` 断言与实际参数不匹配,守卫用例失败 | 改名必须同时覆盖 `linuxdeploy-exclude-wrapper.rs` 的 `OsString::from("OpenTypeless.AppDir")` 期望值与 shell 侧传入值,改完立即跑该守卫用例 |
| README 截图仍显示账号 / 升级入口 | 用改造前的界面冒充改造后的产品 | §5.6 要求逐张打开确认,露出的截图删除并去掉引用 |
| 残留审计白名单被过度使用 | 旧名残留被当成「例外」放过 | §13 第 9 步把白名单限定为 4 条具体位置,并禁止整文件豁免(如 `package-lock.json`) |
| 图标去背误伤麦克风图形 | 源图背景与麦克风同为近白色(250–254 vs 254,255,254),用「白色转透明」会把麦克风打穿,图标直接废掉 | §4.1 强制使用四角 flood fill 或几何遮罩,禁止全局色键;§13 第 11 步对麦克风区域 alpha 做采样核验 |
| 图标圆角不透明 | 源图无 alpha,直接生成会在 Dock 露出白色直角 | §4.1 第 1 步先做透明化再生成;§13 第 11 步核验四角 alpha 为 0 |

## 16. 审批

本文档经用户逐项确认后进入实现计划(`writing-plans`)。已确认项见 §3,未确认项不存在 —— 所有影响交付范围的决策均已在评审中定下。
