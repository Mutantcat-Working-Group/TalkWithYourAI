# TalkWithYourAI 本地化改造(去登录 · 自配 API)设计

Date: 2026-11-06
Revised: 2026-11-08(依据六路只读审计补全清单、修正计数、新增兼容性决策)
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
- **不保留上游多语言门面。** 16 份非中英语言 README 删除,不提供替代翻译,只维护中英两份(§5.6)。
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
| 仓库门面 | 18 份语言 README 只保留 `README.md` 与 `README_zh.md`,其余 16 份删除;上游捐款链接与发布设施删除;`handoff.md` 删除 |
| 上游内部文档 | `docs/` 与 `docs/superpowers/` 中的上游文档全删,仅保留本次这份 spec |
| 词典文件格式标识 | 改名为 `talkwithyourai_dictionary`,同时兼容读取旧标识 |
| 应用图标 | 用用户提供、位于仓库根的 `icon.png` 替换全套应用图标(§4.1) |
| `HistoryProviderKind::ManagedCloud` | **保留枚举成员与 `"managed_cloud"` DB 值**(存量历史行仍可能带此值),但停止产生新值:`history_provider_kind()` 不再返回它,前端仍能渲染旧行。见 §7.5 |
| `OPENTYPELESS_*` 环境变量 | **改名并同时接受旧名**(双读,新名优先),避免破坏老用户已有的 workaround。见 §4.2 |
| CSP | 一并收窄:`*.opentypeless.com` 与 `accounts.google.com` 删除,并补上 updater 下载重定向所需的 GitHub 资产域。见 §5.4 |
| `icons/ios/`、`icons/android/` | `npx tauri icon` 会生成这两个目录;本项目只做桌面三平台,**生成后删除并加入 `.gitignore`**。见 §4.1 |

## 4. 目标身份

需要同步替换的位置:

| 位置 | 现值 | 目标值 |
| --- | --- | --- |
| `src-tauri/tauri.conf.json` → `productName` | `OpenTypeless` | `TalkWithYourAI` |
| `src-tauri/tauri.conf.json` → `identifier` | `com.opentypeless.app` | `org.mutantcat.talkwithyourai` |
| 窗口标题(main / capsule / ask) | `OpenTypeless *` | `TalkWithYourAI *` |
| `src-tauri/Cargo.toml` → `package.name` | `opentypeless` | `talkwithyourai` |
| `src-tauri/Cargo.toml` → `lib.name` | `opentypeless_lib` | `talkwithyourai_lib` |
| `src-tauri/src/main.rs:5` | `opentypeless_lib::run()` | `talkwithyourai_lib::run()` |
| `src-tauri/src/credentials.rs` → `SERVICE_NAME` | `OpenTypeless` | `TalkWithYourAI` |
| `src-tauri/src/lib.rs` → `opentypeless.db` | `opentypeless.db` | `talkwithyourai.db` |
| `src/lib/constants.ts` → `APP_NAME` | `OpenTypeless` | `TalkWithYourAI` |
| `src/lib/constants.ts` → `APP_REPO_URL` / `APP_LICENSE_URL` | 上游地址 | 本仓库地址 |
| `src/i18n/locales/*.json` → `app.name`(10 份) | `OpenTypeless` | `TalkWithYourAI` |
| **`src/i18n/locales/*.json` → 其余品牌字面量**(见 §4.3) | 含 `OpenTypeless` | `TalkWithYourAI` |
| **`src-tauri/Info.plist` → 3 条用途说明**(见 §4.4) | 含 `OpenTypeless` | `TalkWithYourAI` |
| **`src-tauri/src/tray.rs` → 11 条 `about:` 菜单** | `关于 OpenTypeless` 等 | `关于 TalkWithYourAI` 等 |
| 托盘 tooltip 与启动日志 | `OpenTypeless` | `TalkWithYourAI` |
| 词典 / 场景导出文件名前缀 | `opentypeless-*` | `talkwithyourai-*` |
| `package.json` → `name` / `repository` / `homepage` / `author` / `version` | 上游信息 | 本仓库信息 |
| `src-tauri/src/lib.rs` → tracing 过滤器默认指令 | `opentypeless=debug` | `talkwithyourai=debug` |
| `index.html` → `<title>` | 含上游名 | `TalkWithYourAI` |
| `.github/CODEOWNERS` | `@tover0314-w` | Mutantcat 团队账号或删除该文件 |
| `.github/workflows/*.yml` → 临时目录名 | `opentypeless-packaging-tools` 等 | `talkwithyourai-*` |
| `.github/scripts/*` → 打包守卫内部标识 | `.opentypeless-linuxdeploy-*`、`OpenTypeless.AppDir`、`OpenTypeless.AppImage` | 同步改名,**两侧必须一致**(见 §5.6) |
| `scripts/create-labels.sh` → 目标仓库 | `tover0314-w/opentypeless` | 删除该脚本(§5.6) |
| **`src-tauri/Cargo.lock`** | `name = "opentypeless"`(第 3329 行) | 随 `Cargo.toml` 改名由 cargo 重新生成 |
| **`package-lock.json`** | 顶层 `name` 与 `packages[""].name` | 随 `package.json` 改名由 `npm install` 重新生成 |

**跟踪日志过滤器是功能性改动,不是文案**:crate 改名后模块路径随之变化,若不同步修改 `opentypeless=debug` 这一 EnvFilter 指令,`RUST_LOG` 调试输出会静默失效。

### 4.1 应用图标替换

**源文件:** 仓库根目录 `icon.png`,由用户提供。已实测:`1024×1024`、8-bit、**colortype 2(RGB,无 alpha 通道)**,内容为黑底圆角方块 + 白色复古麦克风。

**现状:** `src-tauri/icons/` 下有 8 个文件 —— `32x32.png`、`64x64.png`、`128x128.png`、`128x128@2x.png`、`icon.png`(512×512)、`icon.icns`、`icon.ico`、`app-icon.svg`。`tauri.conf.json` 的 `bundle.icon` 引用其中 5 个;此外 `bundle.linux.appimage.files[".DirIcon"]` 另引用 `icons/icon.png`,**共 6 处图标路径**,替换后都要有效。`app-icon.svg` 是**上游 logo 的矢量源**(满幅圆角矩形 `rx=228`、渐变 `#F5F5F7→#E8E8ED`、深色麦克风 `#1D1D1F`,与现有图标中心色 `(29,29,31)` 一致),必须删除。`index.html` 中没有 favicon 引用,无需处理。

**关键陷阱(已采样验证):** 源图没有 alpha 通道,圆角外的背景是与图形无关的近白色,而麦克风图形本体同样是近白色:

| 采样点 | RGB |
| --- | --- |
| 左上角 `(0,0)` | `(252, 253, 251)` |
| 圆角外 `(20,20)` | `(254, 254, 254)` |
| 麦克风本体 `(512,300)` | `(254, 255, 254)` |
| 圆角内黑底 `(120,120)` | `(23, 23, 23)` |

角部背景均值 `(253.5, 253.9, 253.8)` 与麦克风核心均值 `(252.9, 253.1, 252.9)` 差值 **< 1**,几乎不可分。因此**严禁使用「全局白色 → 透明」的处理方式** —— 实测按 `min(RGB) >= 240` 做全局色键会把麦克风 bbox 内 **107,855 像素(100%)** 全部打穿。

必须使用**从四角 flood fill**(仅清除与图像边界连通的背景像素)。实测 `min(RGB) >= 240`、4 邻域、从四条边 BFS:清除 **208,791 像素(19.91%)**,**麦克风区域 0 像素被清除**。麦克风是单个封闭近白连通块(107,855 px,bbox `x334..688 y167..862`),最近像素距图像边缘 161 px,与边界不连通,flood fill 不会波及。

**flood-fill 阈值必须钉死为 `240`。** 实测 200/210/220/230/235/240/245/248/250/252 全部安全(麦克风 0 误伤),但 **254 会失败** —— 背景无法传播,只清除 0.2%。不写阈值则步骤不可复现。

**处理步骤:**

1. 预处理:对根 `icon.png` 做四角 flood fill 去背(`min(R,G,B) >= 240`,4 邻域),输出带透明圆角的 RGBA 图,保存为 `src-tauri/icons/app-icon-source.png` 并入库,作为后续重新生成图标的唯一源文件。
2. 生成全套图标:`npx tauri icon src-tauri/icons/app-icon-source.png`(Tauri CLI 已在 devDependencies 中,版本 2.11.2)。该命令会覆盖 `src-tauri/icons/` 下的标准产物(`icon.icns`、`icon.ico`、各尺寸 PNG,以及 Windows Store 系列)。
3. **删除 `npx tauri icon` 生成的 `src-tauri/icons/ios/`(18 个文件)与 `src-tauri/icons/android/`(18 个文件)。** 本项目只做桌面三平台,这两个目录是 CLI 的固定产物;同时把 `src-tauri/icons/ios/`、`src-tauri/icons/android/` 加入 `.gitignore`,避免下次重新生成时又进版本库。实测该命令共生成 **52 个文件**,远多于现有 8 个。
4. 删除 `src-tauri/icons/app-icon.svg`(上游 mark)。**CLI 不会自动删除它,必须显式 `git rm`。**
5. 确认 `tauri.conf.json` 的 `bundle.icon` 5 项引用 + `bundle.linux.appimage.files[".DirIcon"]` 均指向已生成的文件。
6. 删除仓库根的 `icon.png`(已由第 1 步的源文件取代)。**根 `icon.png` 未入库前不要删**;当前它已在 `dc69d59` 提交,删除是安全的。
7. 托盘图标无需单独配置:`lib.rs` 通过 `app.default_window_icon()` 从 bundle 图标派生,但必须实际验证托盘显示为新图标。
8. 验证 `.app` 的 Dock 图标四角透明、无白色直角残留。

**排布说明(不默认调整):** 源图主体为 924×926、四周留白约 50px;Apple 官方网格为 824×824 主体 + 100px 留白。当前构图在 Dock 中会比系统图标略大。默认**保持用户给定构图不变**,仅做透明化。**源图实测圆角半径约 149 px**(四角拟合 148.25 / 149.55 / 149.98 / 148.66)。若要与系统图标视觉一致、把主体整体缩放到 824 并居中,按等比缩放圆角应为 **约 133 px**;早期草稿中的「约 185 px」是 Apple 标准满幅半径(`228 × 824/1024`),照此调整会让圆角明显变胖,不要使用。此项需用户明确要求才执行。

**关于 `docs/app-icon-sources.md`:** 该文件记录的是应用感知功能所用的**第三方应用图标**(webp)来源与授权信息,与产品自身图标无关,**必须保留**(见 §5.6)。

`package.json` 的 `version` 与 `Cargo.toml` 的 `version` 必须保持同值(当前均为 `1.1.64`);`src/lib/constants.ts` 的 `APP_VERSION` 开发期回退值 `v1.1.61` 一并校正为与二者一致。

**许可相关例外:** `LICENSE`、`THIRD_PARTY_NOTICES.md` 的原版权声明与 `README*.md` 中的上游出处说明必须保留,不得因为改名而删除。见 §12。

### 4.2 运行时环境变量(改名 + 双读)

以下环境变量名含旧品牌,但它们是**用户侧可配置的运行时开关**,不是文案。直接改名会让已按上游文档设置过 workaround 的 Linux 用户静默失去保护(崩溃复现),因此采用**双读**:新名优先,旧名兜底。

| 位置 | 旧名 | 新名 |
| --- | --- | --- |
| `lib.rs:644` | `OPENTYPELESS_DISABLE_WEBKIT_DMABUF` | `TALKWITHYOURAI_DISABLE_WEBKIT_DMABUF` |
| `lib.rs:645` | `OPENTYPELESS_DISABLE_WEBKIT_COMPOSITING` | `TALKWITHYOURAI_DISABLE_WEBKIT_COMPOSITING` |
| `lib.rs:646` | `OPENTYPELESS_FORCE_GDK_X11` | `TALKWITHYOURAI_FORCE_GDK_X11` |
| `lib.rs:647` | `OPENTYPELESS_FORCE_SOFTWARE_GL` | `TALKWITHYOURAI_FORCE_SOFTWARE_GL` |
| `native_hotkey.rs:740` | `OPENTYPELESS_ACCEPT_SYNTHETIC_HOTKEY_EVENTS` | `TALKWITHYOURAI_ACCEPT_SYNTHETIC_HOTKEY_EVENTS` |

实现要求:抽出 `env_flag_enabled_compat(new, old)`,先查新名,未设置再查旧名。旧名分支加注释标明「上游兼容别名」,并在 README 的 Linux 排障小节同时列出两个名字。§13 的残留审计对这几个旧名给出**豁免**(它们是兼容别名,不是残留)。

**注:** 这些旧名是 §13.9 审计中 `OPENTYPELESS_` 的唯一合法保留位置,与 `dictionary_io.rs` 的格式标记同理。

### 4.3 i18n 中的品牌字面量

`app.name` 只是 10 份 locale 中 `OpenTypeless` 的**一处**。实测每份 locale 恰好有 **10 处**品牌字面量,其余 9 处必须在 §4 一并替换(保留语义,只换品牌名):

| key | en 现值 |
| --- | --- |
| `app.name` | `OpenTypeless` |
| `cloudRecovery.title` | `OpenTypeless Cloud is temporarily unavailable`(**该 key 随 §5.3 整体删除**) |
| `home.welcome` | `Welcome to OpenTypeless` |
| `onboarding.steps.welcomeSub` | `Set up OpenTypeless in a few steps` |
| `onboarding.steps.chooseModeSub` | `Select how you want to use OpenTypeless`(**该 key 随 §5.3 删除**) |
| `onboarding.permissions.subtitle` | `OpenTypeless asks for access only when a feature needs it.` |
| `settings.storedLocally` | `Stored locally on your device. Never sent to OpenTypeless servers.` |
| 其余 3 处 | 实施时以 `grep -c OpenTypeless` 逐份核验,10 份每份必须归零 |

`settings.storedLocally` 是设置页常驻文案,`onboarding.permissions.subtitle` 出现在引导页,两者都会被 §13.9 的全仓零命中审计抓到,不能遗漏。

### 4.4 `Info.plist` 用户可见文案

`src-tauri/Info.plist` 有 3 条 **macOS 系统权限弹窗**文案,用户授权时直接看到,必须替换:

| key | 现值 |
| --- | --- |
| `NSMicrophoneUsageDescription` | `OpenTypeless needs microphone access to capture voice input for speech-to-text.` |
| `NSSpeechRecognitionUsageDescription` | `OpenTypeless uses Apple Speech to transcribe your voice input when you choose the Apple Speech provider.` |
| `NSAppleEventsUsageDescription` | `OpenTypeless needs automation access to detect the active application for context-aware text output.` |

`src-tauri/Entitlements.plist` 无品牌字面量,无需改动。

### 4.5 代码内的功能性旧名

以下字面量不是文案,但含旧名,且会**逃过按文件列的清单**,只能靠 §13.9 的全仓审计兜住。逐条处理:

| 位置 | 现值 | 处理 |
| --- | --- | --- |
| `src-tauri/src/tray.rs:38-155` | 11 条 `about:` 菜单(10 语言 + 默认) | 替换品牌名 |
| `src-tauri/src/native_hotkey.rs:465/665/804` | 线程名 `opentypeless-native-hotkey-mac` / `-fn-hold-delay` / `-native-hotkey-win` | 改名(仅调试可见) |
| `src-tauri/src/app_detector/cache.rs:134` | 线程名 `opentypeless-context-detector` | 改名 |
| `src-tauri/src/selection.rs:22` | 剪贴板哨兵 `__opentypeless_copy_sentinel_{pid}_{nanos}__` | 改名。**这是写进用户剪贴板的内容**,且被剪贴板恢复逻辑用于匹配,改名后必须确认读写两侧一致 |
| `src-tauri/src/commands/misc.rs:840` | 诊断哨兵 `opentypeless-diagnostic-{}` | 改名 |
| `src-tauri/src/stt/apple_speech.rs:235` | 临时文件 `opentypeless-apple-speech-{}-{}.wav` | 改名 |
| `src-tauri/src/stt/volcengine.rs:360` | 临时文件前缀 `opentypeless-{}-{}` | 改名 |
| `src-tauri/src/stt/aliyun_qwen3_asr.rs:87`(断言在 `:427`) | 请求头 `User-Agent: OpenTypeless/1` | 改为 `TalkWithYourAI/1`。**该头会发往阿里云 API**,属对外可见标识 |
| `src-tauri/src/stt/volcengine.rs:137` | payload `"uid": "opentypeless"` | 改为 `talkwithyourai`。**该字段会发往火山引擎 API** |
| `src-tauri/src/linux_x11.rs:64` | `__opentypeless_missing_lib__.so`(仅测试) | 改名 |
| `src-tauri/src/storage/mod.rs`、`dictionary_io.rs:668` | 测试用 sqlite 文件名 `opentypeless-*-test-*` | 改名(仅测试) |
| `src-tauri/tests/fixtures/certified_models.json:7` | `https://www.opentypeless.com/api/proxy` | 随 §5.1 删除该 fixture 条目 |

## 5. 删除清单

### 5.1 Rust 后端

**整文件删除:**

| 目标 | 位置 | 规模 |
| --- | --- | --- |
| 托管云 STT | `src-tauri/src/stt/cloud.rs` | 654 行 |
| 托管云 LLM | `src-tauri/src/llm/cloud.rs` | 411 行 |
| 托管音频字节流封装 | `src-tauri/src/stt/managed_audio.rs` | 693 行 |
| 云端请求常量 | `src-tauri/src/cloud_request.rs` | 79 行 |
| 云备份恢复命令 | `src-tauri/src/commands/backup.rs` | 362 行 |

**分散逻辑(按文件):**

- `lib.rs`:`DEFAULT_API_BASE_URL`、`api_base_url()`、`CLIENT_VERSION_HEADER`、`with_desktop_client_version()`、`pub mod cloud_request`、`SessionTokenStore` 及 `.manage(...)` 注册;以及 `with_restored_session_token()`(l.84-97)、`show_ask_window` 的 token 参数(l.269)、`dispatch_cli_action` 的 ask token 读取(l.819)、`run()` 内的调用(l.871)、测试 `cloud_session_state_is_managed_before_setup_and_window_scripts`(l.310)与 `desktop_client_version_header_matches_frontend_contract`(l.296)。
- **`pipeline.rs`(最大缺口,早期草稿完全未列)**:`use crate::SessionTokenStore`(l.18)、`generate_cloud_operation_id()`(l.126)与贯穿的 `cloud_operation_id` 字段(l.716/982/1084/1301-1322/1927)、`SessionTokenStore` state 取用(l.1196/1941/2678)、`warm_managed_cloud_on_intent` 两处(l.1331-1334、l.1539)及其 240/480s 预热循环(l.1523-1546)、`PolishTextInput.session_token`(l.735)与 `config.llm_provider == "cloud"` 分支(l.1939-2162)、`run_ask_draft` 的 token 透传(l.2676-2696)、`emit_cloud_session_invalid` 五处(l.1624/1674/1740/2554)、`pre_warm()` 的 `"cloud" => /api/proxy/stt` 与 `llm_provider == "cloud" => /api/proxy/llm` 分支及 `pre_warm_endpoint(…, managed_cloud: bool)`(l.2963-3049)、测试 `history_provider_kind_uses_only_provider_classification`(l.3740)与 `LlmQuota`/`Auth` 用例(l.3699)。
- **`error.rs`**:`AppError::CloudSessionInvalid`(l.26)、`CLOUD_SESSION_INVALID_EVENT = "auth:session-invalid"`(l.29)、`ManagedCloudErrorEnvelope` / `ManagedCloudErrorBody`(l.32-39)、`managed_cloud_error()`(l.41)、`notify_cloud_session_invalid()` / `emit_cloud_session_invalid()`(l.53-56)、`is_retryable` / `to_user_error` / `Display` 中的对应分支(l.77/97/124)、测试(l.295/311)。
- **`credentials.rs`**:`CLOUD_SESSION_NAMESPACE`(l.10)、`CLOUD_SESSION_PROVIDER`(l.11)、`load_cloud_session_token()`(l.107)、`store_cloud_session_token()`(l.113)、`remove_cloud_session_token()`(l.127)。**注意与 §4 的 `SERVICE_NAME` 改名是两件事**,不要混淆。
- **`stt_finalize.rs`**:`finalize_timeout()` 中 `if provider == "cloud" { crate::cloud_request::STT_MAX_TIMEOUT + 15 }` 分支(l.6-15),以及 `cloud_ask_keeps_waiting_after_twelve_seconds` / `cloud_dictation_keeps_waiting_after_two_minutes` 两个测试。**删 `cloud_request.rs` 后此处会悬空引用,必须同步处理**,否则编译失败。保留 `custom-whisper` / whisper-compat 的 `FINALIZE_TIMEOUT` 分支与 `file_upload_ask_does_not_stop_after_twelve_seconds` 测试。
- **`llm/model_capabilities.rs`**:测试模块中的 `const MANAGED_BASE = "https://www.opentypeless.com/api/proxy"`(l.92)与 4 处 `model_capability("cloud", …)` 断言(l.97/106/114/123/131)。生产代码本身是通用的,不动。
- **`src-tauri/tests/fixtures/certified_models.json`**:删除 `"provider": "cloud"` 的条目(l.6-7)。该文件经 `include_str!` 编进二进制(`llm/model_capabilities.rs:32`),是**发布产物的一部分**,同时是 §13.9 会命中的旧域名。
- `commands/config.rs`:`get_session_token`、`set_session_token` 两个命令及其 state 参数;辅助函数 `ensure_main_session_window`、`get_session_token_from_vault`、`set_session_token_with_vault`;`config_with_native_managed_state` 调用点(l.254);相关测试 `session_token_round_trips…`、`session_token_restores…`、`failed_session_vault_write…`、`clearing_session_removes…` 及 3 个 `native_cloud_config()` 用例(l.638-723)。
- `commands/stt.rs`:`cache_managed_stt_capability`、`clear_managed_stt_capability` 命令、`/api/subscription/status` 探针、`has_managed_cloud_access()`(l.130)及 2 个测试;`build_stt_provider_diagnostics` 的 `"cloud" => kind "cloudManaged"` 分支(l.293-300)与 `get_stt_provider_diagnostics` 的 `provider == "cloud"` 分支(l.387)。
- `commands/llm.rs`:订阅状态探针、cloud provider 分支、`has_managed_cloud_access()`(l.35)及 2 个测试、`synthetic_operation_id()`(l.19,仅被 cloud benchmark 使用)。
- `commands/ask.rs`:cloud proxy 分支、`warm_managed_cloud_on_intent` 调用、相关 `token_store` 参数;以及 `build_cloud_ask_body`、`should_use_cloud`、`cloud_auth_required_message`、`cloud_response_error`、`extract_cloud_error_message`、`contains_quota_marker("cloud words")`、`ask_app_error_message` 的 `CloudSessionInvalid` 分支、`ask_stt_api_key` / `answer_question` 中的 `"cloud"` 分支、3 个 cloud 测试(l.1674/1942/1961/1988)。
- `hotkey.rs`:两处 `SessionTokenStore` 取用(l.783/814),转发给 `stop_ask_dictation` / `start_reserved_ask_dictation`。
- `stt/capabilities.rs`:仅剥离 managed 部分 —— `ManagedSttCapability`、`ManagedSttCapabilityState`、`managed_audio_encoding_config()`、`managed_state_from_authenticated_snapshot()`、`compatible_managed_limits()`、`SttTransport::ManagedUpload`、`RecordingLimitSource::ManagedProduct`、`MANAGED_*` 常量及 `recordingLimits.reasons.managed*` 分支、5 个 cloud 测试。**本地各 provider 的录音时长上限逻辑必须保留**,它同时服务本地 provider。
- `storage/mod.rs`:`AppConfig.managed_stt_capability_state` 字段(l.376)及默认值(l.433);`config_with_native_managed_state()`(l.1148)及 3 个调用点(l.1216、`commands/config.rs:254`);`restore_backup_data` / `prepare_backup_dictionary` / `prepare_backup_correction_rules`(l.1530 附近,删 `commands/backup.rs` 后成为死代码)。**`HistoryProviderKind::ManagedCloud` 不删**,见 §7.5。
- `stt/mod.rs`(l.77-86:`"cloud" =>` 分支、`pub mod cloud`、`pub mod managed_audio`、`SttConfig.managed_audio` 字段与默认值)与 `llm/mod.rs`(l.118-119、`pub mod cloud`);`stt/config.rs`(l.117 `stt_provider_requires_api_key` 的 `"cloud"` 例外、测试 `test_cloud_not_in_whisper_config` l.173)。
- **`tray.rs` + `lib.rs:1071-1080`**:托盘「账户」菜单入口 —— `TrayLabels.account`(10 语言)、`MenuItem::with_id(app, "account", …)`(l.240)、以及 emit `navigate "#/account"` 的分支。这是 Rust 侧第三个账号入口,与前端路由删除必须同步。

**计数(已实测,替换早期草稿的错误数字):**

- 已注册命令总数是 **69**(`generate_handler!`,lib.rs:1167-1237),**不是 75**。其中要注销的云/账号命令 **5 条**:`cache_managed_stt_capability`、`clear_managed_stt_capability`、`restore_backup_data`、`get_session_token`、`set_session_token`。`test_stt_connection` / `bench_stt_connection` / `test_llm_connection` / `bench_llm_connection` 保留注册,但去掉 `token_store` 参数。
- `token_store:` 参数共 **14 处**(`commands/ask.rs` 9、`commands/llm.rs` 2、`commands/stt.rs` 2、`lib.rs` 1);`session_token` 字面量在 `src-tauri/src` 中共 47 行(含 16 行测试)。早期草稿的「21 处」不成立,按文件清单逐处清理,不要依赖这个数字。

删除后 `AppConfig` 只剩一个需要处理的丢弃字段(见 §7.1),其余字段全部保留。

### 5.2 前端

**整文件 / 整目录删除:**

| 目标 | 位置 | 规模 |
| --- | --- | --- |
| 账号页 | `src/components/AccountPage/` | index.tsx 1058 行(整目录 1782 行) |
| 升级页 | `src/components/UpgradePage/` | index.tsx 373 行(整目录 636 行) |
| 登录状态 | `src/stores/authStore.ts` | 622 行 |
| 云会话 | `src/lib/cloud-session.ts` | 129 行 |
| 云 API 客户端 | `src/lib/api.ts` | 351 行。**注意:除 checkout / 订阅 / 云备份外,它还导出 `getScenes()`(l.344)与 `ScenePack`,删除前确认无本地场景调用方** |
| 认证客户端 | `src/lib/auth-client.ts` | 52 行 |
| 云服务状态 | `src/stores/cloudServiceStore.ts` | 41 行 |
| 登录回跳 | `src/lib/desktop-auth-callback.ts` | 130 行 |
| 结账意图 | `src/lib/desktop-checkout-intent.ts` | 70 行 |
| 订阅缓存 | `src/lib/last-known-subscription.ts`、`src/lib/subscription-refresh-policy.ts` | 112 / 12 行 |
| 深链登录监听 | `src/lib/deep-link.ts` | 147 行 |
| 云服务横幅 | `src/components/MainLayout/CloudServiceBanner.tsx` | 54 行 |
| 引导页步骤 | `src/components/Onboarding/AccountStep.tsx`、`ModeSelectStep.tsx` | 见 §9 |
| **托管能力同步** | **`src/lib/managed-stt-capability.ts`** | 从待删的 `api.ts` 导入 `AuthenticatedAccountSnapshot`,并调用待删的 `cache/clear_managed_stt_capability`。早期草稿漏列 |

**保留但需改:** `src/components/UpdatePrompt.tsx` —— **组件内没有任何仓库 URL,不需要改动**。早期草稿写的「重写为目标仓库地址」是错的;实际只需改 `tauri.conf.json` 的 updater endpoint(§8)。§8 的表述为准。

**同时移除的分散逻辑:**

- `App.tsx`:auth 初始化、`authLoading`、pending checkout 跳转、订阅聚焦刷新 effect、`initDeepLinkListener` / `readPendingDesktopCheckout` / `shouldRefreshSubscriptionOnFocus` 的 import,以及 `{route === 'upgrade'}` / `{route === 'account'}` 两处渲染。
- `MainLayout/index.tsx`:底部「账号」导航项、侧栏 Pro/升级入口、`hasCloudAccess` 逻辑、`CloudServiceBanner` 的 import 与渲染,以及随之无用的 `Crown` / `CircleUser` 图标 import。
- **`Capsule/CapsuleContextMenu.tsx:65-75`**:右键菜单的「Account」→ `#/account` 与「Upgrade」→ `#/upgrade` 两项。**这是第三个账号入口**,早期草稿完全未提;只删路由不改这里,点菜单会进空页。
- `HomePage/index.tsx`:`{user && …}` 的计划/额度卡片、`RemainingWords` / `QuotaBar` 辅助组件、`useAuthStore` 解构与 `hasManagedCloudAccess`、`navigate('upgrade')`。
- `Settings/SttPane.tsx`、`Settings/LlmPane.tsx`:`isCloud` 分支、`hasManagedCloudAccess`、cloud 专属文案与测试连接旁路;**SttPane 的录音上限 managed 分支(`isManagedCapability` / `isManagedFallback`,l.262-291)一并移除**。
- `hooks/useTauriEvents.ts`:`auth:session-invalid` 监听、`invalidateCloudSessionOnce`、`cloudServiceStore` 的 `setIncident` / `clearIncident`、`managedRunActive` 追踪与空闲时 `refreshSubscription()`。
- `lib/constants.ts`:`API_BASE_URL`、`CLIENT_VERSION_HEADER`、`APP_VERSION_HEADER_VALUE`、`FREE_PLAN`、`CheckoutProduct`、`CLOUD_PLAN_BENEFITS`、`PRO_PLAN`、`LIFETIME_PLAN`、`CHECKOUT_PLANS`、`DEFAULT_CHECKOUT_PRODUCT`、`ACTIVE_CLOUD_PLANS`、`isActiveCloudPlan()`、`STT_PROVIDERS`/`LLM_PROVIDERS`/`LLM_DEFAULT_CONFIG` 中的 `cloud` 条目,以及因此变成空操作的 `ONBOARDING_*_PROVIDERS` 过滤条件。
- `stores/appStore.ts`:`SttProvider`、`LlmProvider` 联合类型中的 `'cloud'`;`SceneSource` 中未被使用的 `'cloud'`;`onboardingMode` / `setOnboardingMode`(l.303/840-841)。**`HistoryEntry.provider_kind`(l.107)的 `'managed_cloud'` 保留**(见 §7.5);**`AppConfig.managed_stt_capability_state`(l.236)删除**。
- `lib/tauri.ts`:`restoreBackupData` / `RestoreBackupResult`;以及随 `stt/capabilities.rs` 同步失效的联合成员 —— `SttTransport` 的 `'managedUpload'`(l.146)、`RecordingLimitSource` 的 `'managedProduct'`(l.149)、`SttProviderDiagnostics.kind` 的 `'cloudManaged'`(l.323)。
- `lib/router.ts`:`Route` 联合类型与 `parseHash()` 中的 `'upgrade'`、`'account'` 两个路由及其跳转(已核实二者均为 `Route` 成员)。
- **`package.json`**:移除 `better-auth` 依赖(`auth-client.ts` 是唯一使用者;`package-lock.json` 中有 41 处引用)。

保留 `lib/backup-settings.ts` 中与云无关的本地配置数据整理逻辑 —— **已核实该文件是纯本地配置白名单,不含任何 cloud / session / token 辅助函数**,无需改动。

### 5.3 i18n

10 份 locale(`en`、`zh`、`ja`、`ko`、`fr`、`de`、`es`、`pt`、`ru`、`it`)统一删除以下 key 树:

- `account.*`
- `upgrade.*`(**含 `upgrade.benefits.*`,见 §5.5 的 `upgradeBenefits.test.ts`**)
- `nav.account`、`nav.upgrade`、`nav.pro`、`nav.ask`(0 处使用)
- `onboarding.account.*`、`onboarding.mode.*`
- `onboarding.steps.signIn`、`onboarding.steps.signInSub`、`onboarding.steps.chooseMode`、`onboarding.steps.chooseModeSub`
- `providers.stt.cloud`、`providers.llm.cloud`
- `settings.cloudSttPro`、`settings.cloudLlmPro`
- `settings.sttSignInHint`、`settings.sttUpgradeHint`、`settings.llmSignInHint`、`settings.llmUpgradeHint`、`settings.sttProActive`、`settings.llmProActive`
- `recordingLimits.reasons.managedCapability`、`recordingLimits.reasons.managedFallback`
- `recordingLimits.allowedCloudRange`、`recordingLimits.currentSelectionWithCloudMax`
- **`cloudRecovery.*`(6 个 key:`title` / `sttBody` / `llmBody` / `tryAgain` / `openSttSettings` / `openLlmSettings`)** —— 云服务横幅文案
- **`capsule.menu.account`、`capsule.menu.upgrade`**
- **`home.proPlan`、`home.upgradeToPro`、`home.freePlan`、`home.wordsRemaining`、`home.wordsReset`**
- **`scenes.signInToBrowse`、`scenes.pro`、`scenes.upgradeToUse`、`scenes.cloudPacks`、`scenes.noCloudPacks`**
- **`errors.stt_invalid_key`、`errors.stt_quota_exceeded`、`errors.llm_quota_exceeded`**

**更正:**早期草稿写的 `cloudService.*` **在本仓库不存在**(10 份 locale 中该 key 的值均为 `null`),按字面执行不会删除任何内容。真正的横幅 key 树是 `cloudRecovery.*`,而它的 `title` 还含 `OpenTypeless` 品牌名。

**`history.providers.managed_cloud` 不删除** —— 存量历史行仍可能带 `managed_cloud`,见 §7.5。

`app.name` 按 §4 改名;其余品牌字面量按 §4.3 处理。现状核实:10 份 locale 的 key 集合当前**完全一致,均为 790 个 key**。改造后必须维持这一性质 —— 以 `en.json` 为基准,用脚本比对全部 10 份文件,不允许出现某语言残留已删 key 或缺失新增 key 的情况。

**注意 §13 第 10 步只校验 key 集合一致性,不校验内容。** 因此「某语言残留了 cloud 文案但 key 仍在」不会被发现,必须额外跑一次 §13.9 的字面量审计。

### 5.4 Tauri 配置与插件

- `src-tauri/tauri.conf.json`:移除 `plugins.deep-link` 配置;`plugins.updater.endpoints` 改为本仓库地址(§8);`pubkey` 必须替换(§8,不是「保持占位」);`productName`、`identifier`、窗口标题按 §4 替换。
- **`src-tauri/tauri.conf.json` → `app.security.csp`(早期草稿完全未提)**:现值
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.opentypeless.com https://accounts.google.com https://github.com`
  改为
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://github.com https://objects.githubusercontent.com`
  - 删除 `https://*.opentypeless.com`(云端点已不存在)。
  - 删除 `https://accounts.google.com`(只服务已删的 OAuth 登录)。
  - 保留 `https://github.com`(updater 请求 `releases/latest/download/latest.json`),**并新增 `https://objects.githubusercontent.com`** —— GitHub Releases 的资产下载会 302 到该域,缺它可能导致更新包下载被 CSP 拦截。
  - 若 §8 的端到端更新验证发现仍需其他域,按实测补,不要凭猜测扩大白名单。
- **`src-tauri/Info.plist`**:按 §4.4 替换 3 条用途说明。
- `src-tauri/Cargo.toml`:移除 `tauri-plugin-deep-link` 依赖;`tauri-plugin-single-instance` 的 `deep-link` feature 移除;保留 `tauri-plugin-updater`、`tauri-plugin-process`。
- `src-tauri/capabilities/*.json`:移除 `deep-link:default` 权限。
- `src-tauri/src/lib.rs`:移除 deep-link 插件注册、单实例 deep-link 处理分支。

**deep-link 移除的边界(需明确,否则会误伤):** `lib.rs:890-895` 依赖 `single-instance` 的 `deep-link` feature 做**第二实例的 URL 转发**。移除后:

- **故意放弃** `opentypeless://` URL 转发(它只服务 OAuth 回调)。
- **必须保留**单实例强制(第二次启动激活已有窗口)与 `parse_cli_action` 的 `toggle` / `ask` 命令行动作(l.336-350 的测试要相应改写,删掉 `opentypeless://auth/callback` 用例,保留 `toggle` / `ask`)。

### 5.5 测试

- **删除:**`src/stores/__tests__/authStore.test.ts`、`authStore.restart.test.ts`、`src/components/AccountPage/__tests__/`(2 个)、`src/components/UpgradePage/__tests__/`、`src/lib/__tests__/auth-client-session.test.ts`、`cloud-session.test.ts`、`desktop-auth-callback.test.ts`、`desktop-checkout-intent.test.ts`、`last-known-subscription.test.ts`、`subscription-refresh-policy.test.ts`、`deep-link.test.ts`;**`src/lib/__tests__/api.test.ts`、`src/lib/__tests__/managed-stt-capability.test.ts`**(早期草稿漏列,二者都 import 待删模块);**`src/i18n/__tests__/upgradeBenefits.test.ts`**(它断言 10 份 locale 都有 `upgrade.benefits.*`,而 §5.3 删除该树 —— 应**删除**,不是更新)。
- **更新:**`MainLayout.test.tsx`、`Settings.test.tsx`、`SttPane.test.tsx`、`LlmPane.test.tsx`、`Onboarding.test.tsx`、`DictionaryPane.test.tsx`、`History.test.tsx`、`AskPanel.test.tsx`、`tauri.test.ts`、`tauri-ask.test.ts`、`useTauriEvents.test.tsx`、**`releaseVersion.test.ts`**(见下)、**`CapsuleContextMenu.test.tsx`**(断言 `capsule.menu.account` / `capsule.menu.upgrade`)、**`History/__tests__/AppContextMeta.test.tsx`**(断言 `history.providers.managed_cloud = "Cloud"`,改为只覆盖 `byok` / `local`)、**`src/i18n/__tests__/errors.test.ts`**(随 `errors.*` 删除项调整)。(`HomePage` 目前没有测试文件,若改造中需要覆盖其账号区块移除后的行为,则新建。)
- **`releaseVersion.test.ts` 是硬依赖,必须一并改(早期草稿漏列):** 它用 `?raw` 导入 `ci.yml` 与 5 个打包守卫脚本,并在 l.25 断言 `upload-linux-verification-artifacts.sh` 含 `OpenTypeless-Linux-${LINUX_ARCH}-GPG-KEY.asc`,在 l.30-31 断言 `ci.yml` 含 `Test Linux AppImage packaging guards` 与 `./.github/scripts/test-linux-appimage-packaging.sh`。该脚本在 §5.6 删除清单里,改名守卫也会打断断言 —— 必须同步移除该 import 与断言。
- **新增:**旧配置回退用例(§7.1),Rust 侧 `AppConfig` 反序列化含 `managed_stt_capability_state` / `stt_provider: "cloud"` 的 JSON 时落到合法默认值;前端 `setConfig` / `updateConfig` / `config:patch` 三条路径收到 `"cloud"` 时的归一化用例;`env_flag_enabled_compat` 的双读用例(新名优先、旧名兜底);词典旧标识导入用例(§7.4)。
- **目标状态:**`npx vitest run` 与 `cargo test` 全绿,且不存在新增的 `#[ignore]`。

### 5.6 仓库门面与文档清理

用户要求旧名与上游设施彻底清理,因此除应用本身之外,以下内容一并处理。

**删除:**

| 目标 | 原因 |
| --- | --- |
| `README_ar/de/es/fr/hi/id/it/ja/ko/nl/pl/pt/ru/th/tr/vi.md`(**16 份**) | 只保留中英两份,其余为上游多语言门面 |
| `handoff.md` | 上游作者的开发交接笔记,内含其本地路径 `/Users/bytedance/...`,与本仓库无关 |
| `.github/FUNDING.yml` | `buy_me_a_coffee: opentypeless` 是**上游作者的收款链接**,保留等于替上游募捐 |
| `.github/workflows/welcome.yml` | 欢迎语指向上游 issues 与 CONTRIBUTING |
| `scripts/create-labels.sh` | 硬编码 `REPO="tover0314-w/opentypeless"`,会往上游仓库建标签 |
| `.github/scripts/import-linux-gpg-key.sh` | 仅服务上游 Linux 发版签名 |
| `.github/scripts/import-windows-certificate.ps1` | 仅服务上游 Windows 发版签名 |
| `.github/scripts/publish-signpath-windows-release.ps1` | 硬编码发布标题 `"OpenTypeless $tagName"`(l.66)。**更正:仓库是 `$env:RELEASE_REPO` 参数化的(l.4/11),不是硬编码 `--repo`**;删除理由是它只服务上游发版流程 |
| `.github/scripts/upload-linux-verification-artifacts.sh` | 内含 `--repo tover0314-w/opentypeless`,上传到上游。删除时同步处理 `releaseVersion.test.ts` 的 import(§5.5) |
| `docs/` 下 **37 份**上游设计与发版文档 | 含 cloud 用量、typeless 竞品对比、上游发版说明等 |
| `docs/superpowers/plans/` 与 `specs/` 中的上游文档 | 清空,仅保留本 spec |
| `docs/images/website.png`、`website-hero.png`、`website-how-it-works.png` | 上游官网营销截图 |
| `docs/images/desktop-upgrade-lifetime.png` | 展示已删除的升级页 |
| `docs/images/demo.gif` | 没有任何 README 引用 |
| 仓库根 `icon.png` | 作为图标源已在 §4.1 第 1 步转为 `src-tauri/icons/app-icon-source.png`,根目录不再保留副本 |
| `src-tauri/icons/app-icon.svg` | 上游 logo 矢量源(§4.1) |

**计数更正:**早期草稿写的「52 份上游文档」是**把 `docs/` 全部 53 个文件减去本 spec 后的结果**,错误地把要保留的 2 份 md 和 13 张图也算了进去。实际待删的是 **37 份 `.md`**(`docs/` 共 40 份 md,减去本 spec、`app-icon-sources.md`、`release-signing.md`)。同理,语言 README 是 **18 份总数 / 16 份待删**,不是 19 / 17。

**保留但需改写(去除上游仓库引用与已删功能章节):**

- `README.md`、`README_zh.md`:删掉云服务 / 订阅 / 账号相关章节与截图(含 `## Configuration` 下的 `### Cloud Option`、`### BYOK vs Cloud`,以及 FAQ 与对比表中的云行)、上游 Star 与 Discord 徽章、上游 Release 徽章;保留 fork 署名(§12);注明多语言 README 已移除。
  - **同时删除第 2 行的 17 条语言切换链接**(`README.md`)与 16 条(`README_zh.md`),否则全是指向已删文件的死链。
  - `README.md:40` 引用的 `docs/images/website-hero.png` 在删除清单里,一并去掉该引用。
  - 云服务相关引用还包括 l.322 的 "optional managed cloud access" 段落与 l.324 的 `www.opentypeless.com` 链接。
- `CONTRIBUTING.md`、`SECURITY.md`、`SUPPORT.md`、`VISION.md`:重写为指向本仓库(现全部指向上游 `tover0314-w/opentypeless` 的 discussions / issues / advisories);`VISION.md` 中「隐私优先 / BYOK / 无强制云账号」表述与本改造方向一致,保留并补上「应用自身不含后端依赖」。
- `.github/CODEOWNERS`:改为 Mutantcat 团队账号;若暂无团队账号则删除该文件。
- **`.github/ISSUE_TEMPLATE/config.yml`**:删除指向上游 discussions 的两个链接。
- **`.github/ISSUE_TEMPLATE/bug_report.yml`、`feature_request.yml`、`provider_request.yml`(早期草稿完全未提)**:替换其中的 `OpenTypeless` 品牌文案(`description`、`placeholder`、`label` 共 7 处);并**从 `bug_report.yml` 的 STT / LLM provider 下拉中删除 `Cloud (Pro)` 选项**(l.79/96),该功能已不存在。
- **`CHANGELOG.md`**:该文件记录上游 v1.1.48 / 0.1.0 历史,其中 0.1.0 条目含 "Optional Cloud (Pro) subscription for managed STT/LLM quota"(l.53)。**处理方式:保留历史条目原文不动**(历史记录不应篡改),但在文件顶部加一条 `[Unreleased]` 说明本次去云改造。不删除整个文件。
- **`.typos.toml`**:`extend-exclude` 中列了 16 份将被删除的 README,删除后需同步缩减该列表,否则留下悬空条目。
- `docs/release-signing.md`:现有内容全部指向上游仓库与上游 secrets,须替换为本仓库的签名/公证说明,并与 §8 的 updater 公钥要求对齐。**注意:该文件提到的 `toverwu-qaq/opentypeless` 仓库在本仓库的 remote 与 git 历史中均不存在**,重写时不要沿用该引用。
- `docs/images/` 其余截图:`app-main-light.png`、`app-settings.png`、`app-history.png`、`onboarding-stt.png`、`v1.1.49-*.jpg`、`voice-flow-demo.gif`。**实施时必须逐张打开确认**,任何露出账号入口 / 升级入口 / 云服务选项的截图一律删除,并去掉 README 中的对应引用 —— 不允许用改造前的界面截图冒充改造后的界面。

**保留不动:**

- `docs/` 中被保留的资产,删除上游文档后 `docs/` 只应剩以下内容,其余一律清除:
  - `docs/app-icon-sources.md` —— 记录应用感知功能所用**第三方应用图标**的来源与授权,是重新发布二进制前的合规依据,必须保留。
  - `docs/release-signing.md` —— 需改写(见上)。
  - `docs/images/` 中经 §5.6 逐张核验后保留的截图。
  - `docs/superpowers/specs/2026-11-06-local-only-byok-design.md`(本文件)。
- `CODE_OF_CONDUCT.md`(无旧名,保留)。
- `.github/workflows/`:`codeql.yml`、`labeler.yml`、`lock-threads.yml`、`pr-title.yml`、`stale.yml`、`typos.yml`、`check-notarization.yml`;`.github/dependabot.yml`、`.github/PULL_REQUEST_TEMPLATE.md`、`.github/labeler.yml`、`.gitignore`、`.gitattributes`、`.editorconfig`、`.prettierrc`、`eslint.config.js`、`tsconfig*.json`、`vite.config.ts`、`vitest.config.ts`、`.vscode/`。`check-notarization.yml` 虽与发版相关,但不含上游引用,是手动触发的公证状态查询工具,保留。
- **`.github/workflows/ci.yml`:保留但必须改 1 行** —— l.80 的 `XDG_CACHE_HOME: ${{ runner.temp }}/opentypeless-packaging-tools` 改为 `talkwithyourai-packaging-tools`。(早期草稿的 §4 要求改这行,§5.6 又把它整体列进「保留不动」,两处矛盾;以本条为准。)
- `.github/scripts/` 中**被 `ci.yml` 依赖**的打包守卫脚本必须保留:`test-linux-appimage-packaging.sh`、`prepare-linuxdeploy-wrapper.sh`、`linuxdeploy-exclude-wrapper.rs`、`linuxdeploy-plugin-appimage-exclude-wrapper.sh`、`verify-appimage-runtime-libraries.sh`。

  **`ci.yml` 实际只直接调用 2 个脚本**(l.75 `test-linux-appimage-packaging.sh`、l.81 `prepare-linuxdeploy-wrapper.sh`,均限 `platform_group == 'linux'`),另外 3 个通过前者间接调用。改名时必须**所有出现处同步**,不只是早期草稿点名的 `OpenTypeless.AppDir`:

  | 字面量 | 出现位置 |
  | --- | --- |
  | `.opentypeless-linuxdeploy-plugin-appimage-real` | `test-linux-appimage-packaging.sh:24`(建 fake 插件)、`prepare-linuxdeploy-wrapper.sh:26`(建真实插件)、`linuxdeploy-plugin-appimage-exclude-wrapper.sh:5`(引用)—— **三处必须一致** |
  | `OpenTypeless.AppDir` | `test-linux-appimage-packaging.sh:44`(传入)、`:46`(断言期望)、`:59`(fake 目录);`linuxdeploy-exclude-wrapper.rs:65`(断言期望)、`:71`(数组字面量)—— **两侧必须一致** |
  | `OpenTypeless.AppImage` | `test-linux-appimage-packaging.sh:80`(传给 `verify-appimage-runtime-libraries.sh`) |
  | `OPENTYPELESS_LINUXDEPLOY_TEST_OUTPUT`、`OPENTYPELESS_APPIMAGE_PLUGIN_TEST_OUTPUT` | `test-linux-appimage-packaging.sh:39/43/55/63` |
  | `.opentypeless-linuxdeploy-*` 其余标识 | 各脚本内部 |

  `verify-appimage-runtime-libraries.sh` 经核实**零旧名命中**,只需保留。改名后立即跑该守卫用例。

## 6. 保留清单

以下能力不做行为改动:

- **BYOK 凭据**:`keyring` 三个平台的原生凭据库存储路径(`set_credential` / `read_credential` / `clear_credential` / `get_credential_status` / `migrate_legacy_credentials`)。
- **本地存储**:SQLite(`history`、`dictionary`、`correction_rules` 及场景/应用映射表)、`tauri-plugin-store`。
- **全部非 cloud 服务商**:STT 的 deepgram、assemblyai、aliyun-qwen3-asr、volcengine-doubao、glm-asr、openai-whisper、groq-whisper、siliconflow、apple-speech、custom-whisper;LLM 的 zhipu、deepseek、siliconflow、openai、gemini、moonshot、doubao、qwen、groq、claude、ollama(免 key)、openrouter。
- **本地可自定义项**:`stt_custom_base_url` / `stt_custom_model`(自建 Whisper)、`llm_base_url`(任意 OpenAI 兼容端点)、`llmProviderRequiresApiKey()` 的 ollama 免 key 判定。
- **功能**:听写与润色流水线、Ask Anything、翻译、应用感知风格映射、词典与纠错规则、场景(内置 / 自定义 + 导入导出)、热键、托盘、辅助功能权限、输出策略与剪贴板回退、录音时长限制、历史记录与保留策略。
- **本地导入导出**:词典 JSON / CSV 导出、场景 JSON 导出、词典导入。
- **`HistoryProviderKind::ManagedCloud` 与 `history.providers.managed_cloud`**(存量数据兼容,见 §7.5)。

## 7. 兼容性与数据迁移

### 7.1 旧配置回退

`AppConfig` 使用 `#[serde(default)]`(storage/mod.rs:330),因此删除 `managed_stt_capability_state` 字段后旧配置不会反序列化失败。但 `stt_provider` / `llm_provider` 的**取值**可能仍是 `"cloud"`。要求:

- **Rust 侧**:在 `normalize_values()`(storage/mod.rs:559)中加入显式回退 —— 若 `stt_provider == "cloud"` → `glm-asr`;若 `llm_provider == "cloud"` → `openrouter`。该函数是唯一漏斗,被 `from_stored_value`(l.717)、`ConfigManager::save`(l.1187)、`prepare_config_for_save`(commands/config.rs:75)调用,**新增回退放这里即可覆盖绝大多数路径**。
- **Rust 侧漏网路径**:`tray.rs:162` 直接 `store.get("app_config")` 读配置,**绕过了 `normalize_values()`**。必须改为走 `ConfigManager` 的读取路径,或在该处单独归一化。
- **前端**:`appStore` 的 `setConfig`(l.820)、`updateConfig`(l.821)、以及 `useTauriEvents.ts:173` 的 `config:patch` 监听**三条入口**都要归一化 —— 现有 `setConfig` / `updateConfig` 只走 `syncHotkeyConfig`,没有归一化钩子。抽出 `normalizeProviderId()` 在三条路径共用,避免下拉框出现空选项。
- 该回退需要在 Rust 与前端两侧各有一条测试覆盖。

### 7.2 换 identifier 的后果(需在 README 说明)

identifier、`productName`、keyring 服务名、数据库文件名同时变更,意味着 TalkWithYourAI 与既往的 OpenTypeless 安装是**两个互不相关的应用**:

- 应用数据目录变化 → 旧的历史记录、词典、场景不会自动继承。
- keyring 服务名变化 → 旧的 API key 不会自动继承,需要重新填写。
- 旧的 OpenTypeless 与本应用可以同时安装、互不干扰。

迁移手段(写入 README,不写自动化代码):

- **历史 / 词典 / 场景**:SQLite 文件位于旧应用数据目录(`opentypeless.db`),可手动复制并改名为 `talkwithyourai.db`;词典也可用 JSON / CSV 导出后重新导入。
- **`settings.json`(早期草稿漏项)**:`tauri-plugin-store` 的 `settings.json` **也**在应用数据目录,里面存 `app_config`、窗口几何(`window_state`)以及 **`onboarding_completed`**(见 `src/lib/tauri.ts:653-665`)。只复制 `.db` 的用户会**重跑引导页**并丢失窗口位置。README 需明确:要么把 `settings.json` 一并复制(注意 `identifier` 变了目录名,需手动放到新目录),要么接受重新引导。
- **API key**:keyring 的 account 是 `{namespace}.{provider}.api_key` 结构,新应用需重新填写。README 说明「切换 provider 等于换一把 key」,不要暗示 key 会跟随。

### 7.3 云备份能力的去处

账号页删除后,`restore_backup_data` 失去全部调用方(`src/lib/tauri.ts` 是唯一入口,且只被账号页的云备份下载流程使用),因此整条路径删除,包含 `commands/backup.rs` **以及它在 `storage/mod.rs` 的实现**(`HistoryStore::restore_backup_data`、`prepare_backup_dictionary`、`prepare_backup_correction_rules`,早期草稿只列了命令文件,漏了 storage 侧)。

未来若要恢复数据可携带性,正确的形态是**本地文件导出 / 导入**(导出为 JSON,由用户自己选择保存位置),而不是任何云端备份。该能力**不在本次范围内**,不做实现。

### 7.4 词典文件格式标识改名(需双向兼容)

`src-tauri/src/dictionary_io.rs` 中有两处 `opentypeless_dictionary` 并非品牌文案,而是**用户可见的文件格式标识**:

- `CSV_MARKER = "# opentypeless_dictionary"`(l.11,CSV 首行标记)
- JSON 载荷中的 `"format": "opentypeless_dictionary"`(l.593,校验在 l.211)

按「不留旧名」的要求改名为 `talkwithyourai_dictionary`,但**必须同时兼容读取旧标识**,否则旧版导出的词典文件将无法导入:

- 导出:只写新标识 `talkwithyourai_dictionary`。
- 导入:`talkwithyourai_dictionary` 与 `opentypeless_dictionary` 均接受,后者视为旧版格式正常解析。**两处读取(CSV 与 JSON)都要加第二个可接受常量** —— 现有读路径是精确 `==` / `starts_with` 比较,不是模糊匹配。
- 测试:新增用例覆盖「导入旧标识 CSV」与「导入旧标识 JSON」两条路径,并断言导出产物只含新标识。
- 该旧标识字符串是本设计中**唯一允许以字面量形式保留旧名的地方**(另见 §4.2 的环境变量别名),需在代码处加注释说明其为向后兼容的格式标记,避免后续被当作残留清理掉。

### 7.5 `HistoryProviderKind::ManagedCloud` 的去留

这是一个早期草稿没有做的决策。现状是六处联动:Rust 枚举(`storage/mod.rs:1283`)、DB 值 `"managed_cloud"`(l.1292/1300)、`history_provider_kind()`(`pipeline.rs:298-306`)、前端 `HistoryEntry.provider_kind`(`appStore.ts:107`)、UI 渲染(`History/AppContextMeta.tsx:45`)、i18n `history.providers.managed_cloud`、测试(`AppContextMeta.test.tsx`)。

**决策:保留枚举成员、DB 值、前端类型与 i18n,只切断产生路径。**

- 理由:DB 列默认 `'local'`,但存量用户的历史行可能已写入 `'managed_cloud'`;删掉枚举会让这些行反序列化失败或显示为原始 key。历史记录不该因改造而损坏。
- 具体动作:删除 `pipeline.rs` 中 `history_provider_kind()` 返回 `ManagedCloud` 的分支(改造后不存在 cloud provider),该函数与测试改为只覆盖 `byok` / `local`;其余五处保持不变。
- 副作用:`AppContextMeta.tsx` 与 `history.providers.managed_cloud` 成为「只为旧数据存在」的代码,需加注释说明,避免后续被当作残留清理。

## 8. 自动更新

- 保留 `tauri-plugin-updater`、`tauri-plugin-process` 与 `UpdatePrompt` 组件,`check()` 失败时维持现有行为(捕获异常、`console.warn`、静默不显示)。**`UpdatePrompt.tsx` 本身无需修改**(早期草稿的「重写为目标仓库地址」是错的,组件内没有 URL)。
- `endpoints` 改为:
  `https://github.com/Mutantcat-Working-Group/TalkWithYourAI/releases/latest/download/latest.json`
- **CSP 必须同步放行**(§5.4):GitHub Releases 的资产下载会重定向到 `objects.githubusercontent.com`。
- **`pubkey` 必须替换为自建密钥对的公钥,且这是安全项而非仅功能项。** 现有 `pubkey` 属于上游作者,且 `createUpdaterArtifacts: true` 意味着任何构建都会产出签名产物 —— 若继续用上游公钥,产物的「合法签名」验证的是上游作者的身份,第三方可以签发能通过本应用校验的更新包。生成方式:`npx tauri signer generate -w ~/.tauri/talkwithyourai.key`,公钥写入 `tauri.conf.json`,`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 存入本仓库 CI secrets。在完成这一步之前,更新检查会因签名校验失败而报错 —— 表现为静默 warn,不影响应用使用,但**首次公开发布前必须完成**。
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
- `TOTAL_STEPS` 从 8 改为 6(`index.tsx:18`);**`titles` 数组(l.58,8 项)必须同步截断为 6 项并删除账号 / 模式两项**(早期草稿漏列,不改会导致 `titles[step]` 越界或标题错位)。
- **`canNext` 的 `case 1: return !!user` 与 `case 2: return onboardingMode !== null` 两个分支删除**;`step === 0` 之后的默认放行逻辑保留。
- 删除 `onboardingMode` 状态与 `appStore` 中的 `onboardingMode` / `setOnboardingMode`(确认无其他消费方后)。
- 删除 `handleSkip` 中 `step === 1` 跳转到 BYOK 的特殊分支、`handleBack` 中 `step === 5 && onboardingMode === 'cloud'` 与 `step === 3 && !user` 两个特殊分支,以及 `handleNext` 中 `step === 2 && onboardingMode === 'cloud'` 的分支。
- **保留**「STT 与 LLM 必须测试通过才能继续」这一约束(即原 `sttTestStatus === 'success'` / `llmTestStatus === 'success'` 判定)。用户在 §3 中选择了该默认行为。
- 「跳过」按钮保留:非第 1 步时跳过整个引导。

## 10. 设置界面

保留现有「语音识别」与「AI 润色」两个面板及 `SettingsSidebar` 的 6 个面板(通用 / 语音识别 / AI 润色 / 词典 / 场景 / 关于),不合并、不改名。仅做以下收窄:

- **语音识别面板**:`provider` 下拉去掉「OpenTypeless 云服务」选项;删除 `isCloud` 分支、cloud 专属的「Pro 权益」提示区块、`hasCloudAccess` 判断、因 cloud 而旁路的测试连接逻辑,以及录音上限的 managed 分支(`isManagedCapability` / `isManagedFallback`,l.262-291)。保留主界面常见 provider 的 API key 输入、自建 Whisper 的 base URL / 模型 / 预设、各 provider 录音上限提示。
- **AI 润色面板**:同上 —— 去掉 cloud 选项与 Pro 提示;保留 provider / API key / base URL / 模型、拉取模型列表、连接测试、benchmark、Ollama 免 key 处理、润色风格、上下文适配、翻译目标语言。
- **设置页可发现性**:首次无 key 时,「语音识别」/「AI 润色」面板沿用现有缺失凭据提示;不新增引导弹窗。
- **关于面板**:版本号、仓库地址、许可地址改指向本仓库;删除任何订阅相关文案。

## 11. 改造后的网络行为

改造后应用只有以下出网调用,全部由用户显式配置触发:

1. 用户在「语音识别」面板选择的 STT 服务商(WSS / HTTP,使用用户自己的 key 或本地端点)。
2. 用户在「AI 润色」面板选择的 LLM 服务商(含 Ollama 等本地端点)。
3. 语音搜索类意图按用户语音指令打开的站点(经系统默认浏览器 / `opener` 打开,属用户主动行为)。**`SearchProvider` 有四个变体:`Google`、`YouTube`、`Amazon`、`GitHub`(`voice_intent/types.rs:61-68`)** —— 其中 `Amazon` 是购物搜索而非搜索引擎,README / 隐私说明中不要统称「搜索引擎」。
4. 自动更新检查(§8),不携带任何用户数据。

已核实:代码库中**不存在**遥测、埋点、崩溃上报或分析 SDK(`grep -i "telemetry|analytics|sentry|posthog|amplitude|mixpanel|bugsnag|datadog|gtag|umami|matomo|plausible"` 在源码、`Cargo.toml`、`package.json` 中均无结果;仅 `package-lock.json` 里有 `better-auth` 的传递依赖,而 `better-auth` 本身随 §5.2 删除)。改造完成后应用不再包含任何指向 `opentypeless.com` 的运行时请求。

**两处对外可见的旧名会随请求发出**,必须在 §4.5 一并改名:阿里云 STT 的 `User-Agent: OpenTypeless/1`、火山引擎 payload 的 `"uid": "opentypeless"`。

## 12. 许可与署名

MIT 许可证要求保留原版权声明,因此:

- `LICENSE`(MIT,Copyright 归原作者)与 `THIRD_PARTY_NOTICES.md` **原样保留**。
- `README.md` 增加一行 fork 说明,注明本项目基于 `tover0314-w/opentypeless` 修改。
- README 中的云服务、订阅、账号相关章节删除或改写;上游链接类内容(Star、Discord、Release 徽章)按品牌改名相应处理。
- 16 份非中英语言 README 按 §5.6 **删除**,不做改名保留,也不在本仓库内提供替代翻译;此后只维护 `README.md` 与 `README_zh.md` 两份。`README.md` 需在其中注明多语言版本已随上游内容一并移除。

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
   - 代码中不得命中:`www.opentypeless.com`、`api_base_url`、`SessionTokenStore`、`managed_stt`、`cloud_request`、`authStore`、`hasManagedCloudAccess`、`cloud-session`、`tauri-plugin-deep-link`、`opentypeless.db`、`OPENTYPELESS_`(例外见下)、`better-auth`。
   - **更正:早期草稿写的 `OPEN_TYPELESS`(带下划线)在本仓库零命中,该条审计会空过。** 实际存在的是 `OPENTYPELESS_` 前缀(环境变量与打包脚本变量),已按此改写。
   - 全仓(含 `README*`、`.github/`、`scripts/`、`docs/`)不得命中字面量 `OpenTypeless` / `opentypeless`,**唯一豁免**是下面这份白名单:
     - `LICENSE` 与 `THIRD_PARTY_NOTICES.md` 中的原版权声明(§12)。
     - `README.md` / `README_zh.md` 中的一行 fork 出处说明(§12)。
     - `src-tauri/src/dictionary_io.rs` 中作为向后兼容格式标记的旧标识 `opentypeless_dictionary`(§7.4)。
     - `src-tauri/src/lib.rs` 与 `native_hotkey.rs` 中作为兼容别名的 `OPENTYPELESS_*` 环境变量名(§4.2),需带注释。
     - `src-tauri/Cargo.lock` 与 `package-lock.json`:这两处随 `Cargo.toml` / `package.json` 改名由工具重新生成,**改造完成后必须为 0 命中**,不给整文件豁免。**更正:早期草稿为 `package-lock.json` 编的理由(「来自 npm 依赖的包名或 URL 佐证」)是错的** —— 实测其中仅 2 处,都是本包自身 `name`,不是依赖来源。
   - 白名单以外的任何命中都视为未完成。
10. i18n key 一致性脚本:10 份 locale 的 key 集合完全一致,且不含 §5.3 列出的 key 树。**该步骤只校验集合一致性,不校验内容**,须另跑一次 `grep -c OpenTypeless src/i18n/locales/*.json`,每份必须为 0(§4.3)。
11. 图标资产核验:
    - `src-tauri/icons/` 下 `icon.icns`、`icon.ico`、各尺寸 PNG 均由新源生成(比对 mtime);
    - `app-icon.svg` 已删除;`icons/ios/`、`icons/android/` 已删除且在 `.gitignore` 中;
    - `icon.png` 与 `128x128.png` 的 colortype 为 6(RGBA);
    - 对生成后的 `128x128.png` 采样四角,确认 alpha 为 0(圆角透明,无白色直角);
    - 确认**麦克风核心区域 alpha 为 255,且麦克风内无整块透明空洞**(注意:麦克风边缘的抗锯齿像素是部分透明,不能断言「所有麦克风像素 alpha 都为 255」);
    - `bundle.icon` 5 项 + `bundle.linux.appimage.files[".DirIcon"]` 共 6 处路径均存在。
12. **环境变量双读用例**:设置 `OPENTYPELESS_*` 旧名时 workaround 仍生效,设置 `TALKWITHYOURAI_*` 新名时优先,两者同时设置时新名胜出。

**无法在本机完成的验证(需真机,明确记录为未验证项):**

- macOS / Windows / Linux 实际安装包运行、签名与公证。
- 麦克风与辅助功能权限的真实授权流程。
- 用真实 API key 对各家服务商逐一连通测试。
- 自动更新的端到端链路(在 §8 的签名公钥替换与首个 release 发布之前无法验证),**含 CSP 放行 `objects.githubusercontent.com` 后能否真正下载更新包**。
- 托盘与 Dock 图标在三个平台的实际显示。

工具链位置(本机不在默认 PATH 上):`~/.cargo/bin/cargo`、`~/.nvm/versions/node/v22.23.1/bin/node`。

## 14. 交付顺序

1. **后端拆除**:Rust 侧云端模块(`stt/cloud.rs`、`llm/cloud.rs`、`stt/managed_audio.rs`、`cloud_request.rs`、`commands/backup.rs` + storage 侧实现)、**`pipeline.rs`**、**`error.rs`**、**`credentials.rs` 的 session 函数**、**`stt_finalize.rs`**、**`model_capabilities.rs` 测试与 fixture**、会话令牌、命令注册、配置字段与回退,`cargo test` + clippy 通过。
2. **前端拆除**:云模块、账号页、升级页、导航入口(**含胶囊右键菜单**)、`App.tsx`、`appStore` 类型与回退、`managed-stt-capability.ts`、`better-auth` 依赖,`vitest` 通过。
3. **引导页与设置面板收窄**(含 `titles` 数组与 `canNext` 分支)。
4. **品牌替换**(§4 / §4.3 / §4.4 / §4.5)与 Tauri 配置 / 依赖 / 权限调整(**含 CSP**)。
5. **环境变量改名与双读**(§4.2)。
6. **应用图标替换**(§4.1):去背(阈值 240)→ `tauri icon` → 删 `app-icon.svg` → 删 `ios/`+`android/` → 四角与麦克风采样核验。
7. **i18n 清理与一致性校验**(§5.3,含 `cloudRecovery.*` 与 ~25 个云相关 key)。
8. **词典格式标识改名与双向兼容**(§7.4)。
9. **仓库门面与上游文档清理**(§5.6),含打包守卫脚本的同步改名(三处 `.opentypeless-linuxdeploy-plugin-appimage-real` + 两处 `AppDir` + `AppImage` + 两个 `OPENTYPELESS_*_TEST_OUTPUT`),以及 `releaseVersion.test.ts` 的同步修改。
10. **README 与许可署名处理**(§12)。
11. **全量验证与残留审计**(§13)。

每一步独立可验证,便于在任一步骤失败时定位问题范围。

## 15. 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 删除 `token_store` 参数波及 14 处签名 + 47 处字面量 | 编译期大量连锁错误 | 按 §14 顺序先做后端,依赖 Rust 编译器穷举所有断点;前端随后用 `tsc --noEmit` 兜底 |
| **`pipeline.rs` 是最大聚集点且早期草稿未列** | 按清单施工会在编译期大面积爆炸 | §5.1 已逐行列出;施工时以编译器为准,不要假设清单完备 |
| **`stt_finalize.rs` 引用 `cloud_request::STT_MAX_TIMEOUT`** | 删 `cloud_request.rs` 后悬空引用,编译失败 | 同步删除该分支与 2 个 cloud 测试(§5.1) |
| `capabilities.rs` 中 managed 与本地逻辑交织 | 误删会导致本地录音上限显示异常 | 只删 managed 专有函数与分支,保留 provider 上限表;由现有 recordingLimits 测试回归 |
| i18n 10 份文件手工删 key 易错位 | 运行时缺 key 显示原始 key 字符串 | 用脚本比对 key 集合并纳入 §13 验证流程 |
| **§13 第 10 步只查 key 集合,不查内容** | 残留 cloud 文案但 key 仍在,审计会通过 | 额外跑 §13.9 的字面量审计 + `grep -c OpenTypeless` |
| **`OPENTYPELESS_*` 直接改名** | 老用户已设的 Linux workaround 静默失效,崩溃复现 | §4.2 强制双读,新名优先、旧名兜底 |
| **CSP 未同步放行 GitHub 资产域** | 更新包下载被拦截,自动更新失效 | §5.4 补 `objects.githubusercontent.com`,并在 §13 真机项中记录 |
| 换 identifier 后旧用户数据「消失」 | 用户误以为数据丢失 | README 明确写出两个应用互相独立及迁移步骤(§7.2),**含 `settings.json` 与 `onboarding_completed`** |
| **`HistoryProviderKind::ManagedCloud` 处置错误** | 存量历史行反序列化失败或显示原始 key | §7.5 决定:保留枚举与 i18n,只切断产生路径 |
| 上游 `pubkey` 未替换即发版 | 更新下载必然签名校验失败;**且第三方可签发通过校验的更新** | README 与 §8 明确标注为首次发版前必做项,并按安全项对待 |
| 仓库无发版流水线 | 改完 endpoint 也无法产出 `latest.json` | 明确列为独立后续任务,不在本范围内假装完成 |
| `.github/scripts/` 中打包守卫脚本被误删 | 误删会使 CI 的 Linux 打包守卫任务失败 | §5.6 已区分「发布专用(删)」与「打包守卫(留)」两组,删除前先核对 `ci.yml` 的调用点 |
| **打包守卫字面量只改一侧** | `test-linux-appimage-packaging.sh` 断言与实际参数不匹配,守卫用例失败 | §5.6 列出全部 5 类字面量与三处 `.opentypeless-linuxdeploy-plugin-appimage-real` 的跨文件一致性 |
| **`releaseVersion.test.ts` 的 `?raw` 导入** | 删 `upload-…sh` 或改名守卫脚本都会让该测试失败 | §5.5 明确要求同步移除 import 与断言 |
| README 截图仍显示账号 / 升级入口 | 用改造前的界面冒充改造后的产品 | §5.6 要求逐张打开确认,露出的截图删除并去掉引用 |
| **README 第 2 行的 17 条语言切换链接** | 指向已删文件的死链 | §5.6 要求一并删除 |
| 残留审计白名单被过度使用 | 旧名残留被当成「例外」放过 | §13 第 9 步把白名单限定为 5 条具体位置,并禁止整文件豁免 |
| **审计字面量写错(早期写 `OPEN_TYPELESS`)** | 审计空过,看起来通过但没查任何东西 | §13 已更正为 `OPENTYPELESS_`,并列出唯一合法保留位置 |
| 图标去背误伤麦克风图形 | 源图背景与麦克风同为近白色(差值 <1),用「白色转透明」会把麦克风打穿,图标直接废掉 | §4.1 强制四角 flood fill 且钉死阈值 240;实测清除 208,791 px(19.91%)、麦克风 0 误伤;§13 第 11 步核验 |
| 图标圆角不透明 | 源图无 alpha,直接生成会在 Dock 露出白色直角 | §4.1 第 1 步先做透明化再生成;§13 第 11 步核验四角 alpha 为 0 |
| **图标圆角半径照抄 185px** | 源图实际约 149px,185 是 Apple 标准满幅值,照此调整圆角会明显变胖 | §4.1 已更正:实际约 149px,824 网格等比应约 133px |
| **`npx tauri icon` 生成 ios/ android/** | 桌面应用多出 36 个无用文件进版本库 | §4.1 第 3 步删除并加 `.gitignore` |

## 16. 审批

本文档经用户逐项确认后进入实现计划(`writing-plans`)。已确认项见 §3(2026-11-08 修订新增 4 项:HistoryProviderKind 保留、环境变量双读、CSP 收窄、ios/android 删除),未确认项不存在 —— 所有影响交付范围的决策均已在评审中定下。
