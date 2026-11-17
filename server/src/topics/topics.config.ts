/**
 * Topic pages (/topics/<slug>), borrowed from aihot.news/topics: one page per
 * company, technical direction or content type, listing the curated items that
 * belong to it. No AI call: membership is pattern matching on what scoring
 * already wrote (titles, tags, category).
 *
 * - company: the company or its product must be in the headline (original or
 *   Chinese). An article that only mentions OpenAI in passing isn't about OpenAI.
 * - direction: headline or tags; tags are the 1-3 Chinese labels scoring adds.
 * - type: the item's category.
 *
 * Slugs are public URLs: add topics freely, but don't rename a slug.
 */
export type TopicGroup = 'company' | 'direction' | 'type';

export interface TopicDef {
  slug: string;
  name: string;
  group: TopicGroup;
  /** One sentence for the topic page and its meta description. */
  description: string;
  /** Names to look for. Latin terms match as whole words, case-insensitive. */
  terms?: string[];
  /** For group 'type': the categories that make up the topic. */
  categories?: string[];
}

export const TOPIC_GROUPS: Array<{ group: TopicGroup; name: string; description: string }> = [
  { group: 'company', name: '公司与模型', description: '按厂商追踪模型、产品与公司动态' },
  { group: 'direction', name: '技术方向', description: '按技术领域追踪进展' },
  { group: 'type', name: '内容类型', description: '按内容形态浏览' },
];

export const TOPICS: TopicDef[] = [
  // ===== 公司与模型 =====
  { slug: 'openai', name: 'OpenAI / ChatGPT', group: 'company', description: 'OpenAI 的全部动态：GPT 系列模型、ChatGPT、Codex、Sora 与公司进展。', terms: ['OpenAI', 'ChatGPT', 'GPT', 'Codex', 'Sora', 'Sam Altman', '奥特曼'] },
  { slug: 'anthropic', name: 'Anthropic / Claude', group: 'company', description: 'Anthropic 的全部动态：Claude 系列模型、Claude Code、安全研究与公司进展。', terms: ['Anthropic', 'Claude', 'Dario Amodei'] },
  { slug: 'google', name: 'Google / Gemini', group: 'company', description: 'Google 与 DeepMind 的全部动态：Gemini、Gemma、Veo 与研究进展。', terms: ['Google', '谷歌', 'Gemini', 'DeepMind', 'Gemma', 'Veo'] },
  { slug: 'meta', name: 'Meta / Llama', group: 'company', description: 'Meta 的 AI 动态：Llama 系列开源模型、FAIR 研究与产品。', terms: ['Meta', 'Llama', '扎克伯格', 'Zuckerberg'] },
  { slug: 'microsoft', name: 'Microsoft / Copilot', group: 'company', description: '微软的 AI 动态：Copilot、Azure AI 与模型合作。', terms: ['Microsoft', '微软', 'Copilot', 'Azure'] },
  { slug: 'nvidia', name: 'NVIDIA / 英伟达', group: 'company', description: '英伟达的动态：GPU、CUDA、AI 基础设施与公司进展。', terms: ['NVIDIA', '英伟达', '黄仁勋', 'Jensen Huang', 'CUDA'] },
  { slug: 'xai', name: 'xAI / Grok', group: 'company', description: 'xAI 的动态：Grok 系列模型与产品。', terms: ['xAI', 'Grok'] },
  { slug: 'apple', name: 'Apple', group: 'company', description: '苹果的 AI 动态：Apple Intelligence、Siri 与端侧模型。', terms: ['Apple', '苹果', 'Siri'] },
  { slug: 'mistral', name: 'Mistral AI', group: 'company', description: 'Mistral AI 的模型发布与产品动态。', terms: ['Mistral'] },
  { slug: 'deepseek', name: 'DeepSeek', group: 'company', description: 'DeepSeek（深度求索）的模型发布、API 与开源动态。', terms: ['DeepSeek', '深度求索'] },
  { slug: 'qwen', name: '阿里 / 通义千问', group: 'company', description: '阿里巴巴与阿里云的 AI 动态：通义千问 Qwen 系列模型与产品。', terms: ['Qwen', '通义', '千问', '阿里云', '阿里巴巴', 'Alibaba'] },
  { slug: 'bytedance', name: '字节跳动 / 豆包', group: 'company', description: '字节跳动的 AI 动态：豆包、火山引擎、Seed 模型与产品。', terms: ['字节跳动', '字节', 'ByteDance', '豆包', 'Doubao', '火山引擎', 'Seedance'] },
  { slug: 'moonshot', name: 'Kimi / 月之暗面', group: 'company', description: '月之暗面的动态：Kimi 系列模型与产品。', terms: ['Kimi', '月之暗面', 'Moonshot'] },
  { slug: 'zhipu', name: '智谱 / GLM', group: 'company', description: '智谱 AI 的动态：GLM 系列模型、清言与开源进展。', terms: ['智谱', 'GLM', 'Zhipu', 'ChatGLM'] },
  { slug: 'minimax', name: 'MiniMax', group: 'company', description: 'MiniMax 的模型发布与产品动态。', terms: ['MiniMax', '海螺'] },
  { slug: 'tencent', name: '腾讯 / 混元', group: 'company', description: '腾讯的 AI 动态：混元大模型、元宝与产品。', terms: ['腾讯', 'Tencent', '混元', 'Hunyuan', '元宝'] },
  { slug: 'baidu', name: '百度 / 文心', group: 'company', description: '百度的 AI 动态：文心大模型、ERNIE 与产品。', terms: ['百度', 'Baidu', '文心', 'ERNIE'] },

  // ===== 技术方向 =====
  { slug: 'agent', name: 'Agent 智能体', group: 'direction', description: '智能体、多智能体协作、MCP 与 Computer Use 的最新进展。', terms: ['Agent', 'Agents', 'Agentic', '智能体', 'AI 代理', 'MCP', 'Computer Use'] },
  { slug: 'coding', name: 'AI 编程', group: 'direction', description: 'AI 编程工具与实践：Claude Code、Cursor、Codex、Copilot 等。', terms: ['AI 编程', 'AI编程', '编码', '编程', 'Coding', 'Claude Code', 'Cursor', 'Codex', 'Copilot', 'Devin', 'Windsurf', 'vibe coding'] },
  { slug: 'reasoning', name: '推理与数学', group: 'direction', description: '模型推理能力、思维链与数学证明的进展。', terms: ['reasoning', '思维链', '推理能力', '推理模型', '数学', '证明', 'Lean'] },
  { slug: 'inference', name: '推理部署与 Infra', group: 'direction', description: '大模型推理加速、量化、部署框架与服务化工程。', terms: ['vLLM', 'SGLang', 'TensorRT', 'llama.cpp', 'Ollama', '推理框架', '推理加速', '推理引擎', '推理服务', '推理成本', '推理部署', '模型量化', '量化部署', 'KV Cache', 'FP8', 'FP4', 'INT4', '投机解码', 'speculative decoding'] },
  { slug: 'multimodal', name: '多模态', group: 'direction', description: '视觉语言模型、多模态理解与交互。', terms: ['多模态', 'multimodal', 'VLM', '视觉语言', '视觉理解'] },
  { slug: 'image', name: '图像生成', group: 'direction', description: '文生图、图像编辑模型与工具。', terms: ['图像生成', '文生图', '生图', 'Midjourney', 'Stable Diffusion', 'FLUX', 'image generation'] },
  { slug: 'video', name: 'AI 视频', group: 'direction', description: '视频生成模型与工具：Sora、Veo、可灵、Runway 等。', terms: ['视频生成', '文生视频', '视频模型', 'Sora', 'Veo', '可灵', 'Kling', 'Runway', 'video generation'] },
  { slug: 'audio', name: '语音与音频', group: 'direction', description: '语音识别、语音合成、实时语音与音乐生成。', terms: ['语音', 'TTS', 'ASR', '音频', '音乐生成', 'Suno', 'voice', 'speech'] },
  { slug: 'robotics', name: '具身智能', group: 'direction', description: '机器人、人形机器人与具身智能模型。', terms: ['具身', '机器人', 'robot', 'robotics', '人形'] },
  { slug: 'open-source', name: '开源生态', group: 'direction', description: '开源模型、开放权重与开源工具。', terms: ['开源', 'open source', 'open-source', 'open-weight', '开放权重', 'Hugging Face'] },
  { slug: 'chips', name: '芯片与算力', group: 'direction', description: 'AI 芯片、GPU、算力与数据中心。', terms: ['芯片', 'GPU', 'TPU', '算力', '数据中心', 'data center', 'Blackwell'] },
  { slug: 'safety', name: '安全与对齐', group: 'direction', description: 'AI 安全、对齐、红队测试与模型滥用。', terms: ['对齐', 'alignment', '红队', '越狱', 'jailbreak', 'AI 安全', 'AI安全', '安全研究', '安全评估', '安全/对齐'] },
  { slug: 'policy', name: '政策监管', group: 'direction', description: 'AI 监管、法案、出口管制与诉讼。', terms: ['监管', '法案', '法规', '政策', '出口管制', '诉讼', '版权', 'regulation', 'lawsuit'] },
  { slug: 'funding', name: '融资与资本', group: 'direction', description: 'AI 公司融资、IPO、估值与并购。', terms: ['融资', 'IPO', '估值', '收购', '并购', '上市', 'funding', 'acquisition', 'acquire'] },

  // ===== 内容类型 =====
  { slug: 'model-release', name: '模型发布', group: 'type', description: '新模型发布、模型更新与评测成绩。', categories: ['model'] },
  { slug: 'product', name: '产品动态', group: 'type', description: 'AI 产品与工具的发布和更新。', categories: ['product'] },
  { slug: 'research', name: '论文研究', group: 'type', description: '值得关注的论文与研究成果。', categories: ['research'] },
  { slug: 'industry', name: '行业动态', group: 'type', description: '公司、融资、人事与市场动向。', categories: ['industry'] },
  { slug: 'tutorial', name: '教程实践', group: 'type', description: '使用技巧、教程与工程实践。', categories: ['tips'] },
  { slug: 'community', name: '社区讨论', group: 'type', description: '开发者社区的热议与观点。', categories: ['community'] },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** One regex per topic: Latin terms as whole words, CJK terms as substrings. */
export function topicPattern(terms: string[]): RegExp {
  const parts = terms.map((t) => {
    const e = escape(t).replace(/\\? /gu, '\\s*');
    return /^[\x20-\x7e]+$/u.test(t) ? `(?<![A-Za-z0-9])${e}(?![A-Za-z])` : e;
  });
  return new RegExp(parts.join('|'), 'iu');
}

export interface TopicCandidate {
  title: string;
  titleZh?: string | null;
  tags?: string | null;
  category?: string | null;
}

/** Whether an item belongs to a topic (see the rules at the top of this file). */
export function matchesTopic(topic: TopicDef, item: TopicCandidate, pattern?: RegExp): boolean {
  if (topic.group === 'type') return Boolean(item.category && topic.categories?.includes(item.category));
  const re = pattern ?? topicPattern(topic.terms ?? []);
  const headline = `${item.title}\n${item.titleZh ?? ''}`;
  if (re.test(headline)) return true;
  if (topic.group === 'company') return false;
  return Boolean(item.tags && re.test(item.tags));
}
